"""Run fixed Rocket/Spike comparisons for footprint size and first-access order."""

import argparse
from dataclasses import dataclass
import os
from pathlib import Path
import re
import shlex
import struct
import subprocess
import sys
import tempfile


SOURCES = Path(__file__).resolve().parent
LAB = Path.home() / "pathfuzz-rocket-spike-lab"
ROCKET = LAB / "rocket-chip"
EMU = ROCKET / "build/emu"
SPIKE_BUILD = LAB / "riscv-isa-sim/difftest/build"
SPIKE = SPIKE_BUILD / "riscv64-spike-so"
RESULTS = LAB / "results"
CROSS = "riscv64-unknown-elf-"
BASE = 0x80000000
LINE_SIZE = 64
IMAGE_SIZE = 4096
FENCE = 0x0330000F  # fence rw,rw
TRAP = 0x0000006B
ANSI = re.compile(r"\x1b\[[0-9;]*m")
COMMIT = re.compile(
    r"\bcommit pc ([0-9a-f]+) inst ([0-9a-f]+) wen ([01]) dst (\d+) data ([0-9a-f]+)\b",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class DataLine:
    offset: int
    value: int
    register: int
    load: int


LINES = {
    "A": DataLine(0x400, 0x11, 7, 0x0002B383),  # ld t2,0(t0)
    "B": DataLine(0x800, 0x22, 28, 0x00033E03),  # ld t3,0(t1)
}


@dataclass(frozen=True)
class Image:
    path: Path
    data: bytes
    order: str
    load_offsets: dict[str, int]
    trap_offset: int


class LabError(Exception):
    pass


def require(ok, message):
    if not ok:
        raise LabError(message)


def run(command, log, *, cwd=None, env=None, timeout=90):
    args = [str(item) for item in command]
    with log.open("w", encoding="utf-8") as stream:
        stream.write(f"$ {shlex.join(args)}\n")
        stream.flush()
        try:
            subprocess.run(args, cwd=cwd, env=env, check=True, timeout=timeout,
                           stdout=stream, stderr=subprocess.STDOUT)
        except (OSError, subprocess.SubprocessError) as error:
            raise LabError(f"{error}. See {log}") from error


def cache_line(image, offset):
    return image[offset:offset + LINE_SIZE]


def inspect_image(path, order):
    data = path.read_bytes()
    require(len(data) == IMAGE_SIZE and data[-1] != 0,
            f"Expected a 4 KiB image with a nonzero end marker: {path}")
    instructions = struct.unpack("<16I", cache_line(data, 0))

    def instruction_offset(word):
        require(instructions.count(word) == 1,
                f"Expected exactly one 0x{word:08x} in the first cache line: {path}")
        return 4 * instructions.index(word)

    offsets = {name: instruction_offset(line.load) for name, line in LINES.items()}
    fence = instruction_offset(FENCE)
    trap = instruction_offset(TRAP)
    first, second = order
    require(offsets[first] < fence < offsets[second] < trap,
            f"Expected {first} load, fence, {second} load, then trap: {path}")
    for name, line in LINES.items():
        marker = struct.pack("<Q", line.value) * (LINE_SIZE // 8)
        require(cache_line(data, line.offset) == marker, f"Wrong marker for {name}: {path}")
    return Image(path, data, order, offsets, trap)


def build_image(directory, order):
    stem = directory / order.lower()
    obj = stem.with_suffix(".o")
    elf = stem.with_suffix(".elf")
    image = stem.with_suffix(".bin")
    run([CROSS + "as", "-march=rv64i", "-mabi=lp64", "--defsym", f"B_FIRST={int(order == 'BA')}",
         "-o", obj, SOURCES / "footprint_lab.S"], stem.with_suffix(".as.log"))
    run([CROSS + "ld", "--no-relax", "-m", "elf64lriscv", "-T", SOURCES / "smoke.ld", "-o", elf, obj],
        stem.with_suffix(".ld.log"))
    run([CROSS + "objcopy", "-O", "binary", "--only-section=.text", elf, image],
        stem.with_suffix(".objcopy.log"))
    run([CROSS + "objdump", "-d", "--stop-address=0x80000040", elf], stem.with_suffix(".disassembly.log"))
    return inspect_image(image, order)


def check_footprint(image, path):
    recorded = path.read_bytes()
    expected = cache_line(image.data, 0) + b"".join(
        cache_line(image.data, LINES[name].offset) for name in image.order
    )
    require(recorded == expected,
            f"Footprint does not match the instruction line and {image.order} data lines "
            f"({len(recorded)} bytes observed). See {path.parent}")
    return recorded


def check_commits(image, log, input_path, values):
    text = ANSI.sub("", log.read_text(encoding="utf-8", errors="replace"))
    lines = text.splitlines()
    require(f"The image is {input_path}" in lines, f"Input not confirmed: {log}")
    require(f"The reference model is {SPIKE}" in lines and "Difftest enabled" in text,
            f"Spike DiffTest was not confirmed: {log}")
    require("different at pc" not in text
            and f"HIT GOOD TRAP at pc = 0x{BASE + image.trap_offset:x}" in text,
            f"Expected successful DiffTest and halt: {log}")
    labels = {BASE + offset: name for name, offset in image.load_offsets.items()}
    observed = []
    for pc, word, write, register, value in COMMIT.findall(text):
        name = labels.get(int(pc, 16))
        if name is not None:
            observed.append((name, int(word, 16), int(write), int(register), int(value, 16)))
    expected = [(name, LINES[name].load, 1, LINES[name].register, values[name]) for name in image.order]
    require(observed == expected, f"Unexpected load order or writeback ({observed}): {log}")
    return {name: value for name, _, _, _, value in observed}


def simulate(image, directory, case, values, *, record=None, replay=None):
    log = directory / f"{case}.log"
    env = dict(os.environ, NOOP_HOME=str(ROCKET), PATH=f"{SPIKE_BUILD}{os.pathsep}{os.environ.get('PATH', '')}")
    input_path = replay if replay is not None else image.path
    options = []
    if record is not None:
        options = [f"--dump-footprints={record}"]
    if replay is not None:
        before = replay.read_bytes()
        mapped = directory / f"{case}.linearized.bin"
        options = ["--as-footprints", f"--dump-linearized={mapped}"]
    run([EMU, f"--image={input_path}", f"--diff={SPIKE}", "--seed=0", "--ram-size=128MB",
         "--max-cycles=100000", "--log-begin=0", "--log-end=100000", "--dump-commit-trace", *options],
        log, cwd=ROCKET, env=env)
    observed = check_commits(image, log, input_path, values)
    if replay is not None:
        require(replay.read_bytes() == before, f"Replay input changed: {replay}")
        restored = mapped.read_bytes()
        for name, line in LINES.items():
            expected = struct.pack("<Q", values[name]) * (LINE_SIZE // 8)
            require(cache_line(restored, line.offset) == expected,
                    f"Restored data for {name} at 0x{BASE + line.offset:x} differs: {mapped}")
    return [case, "->".join(observed), f"0x{observed['A']:02x}", f"0x{observed['B']:02x}", "PASS"]


def report(directory, rows):
    columns = ["Case", "Load order", "A (0x80000400)", "B (0x80000800)", "Spike DiffTest"]
    result = "\n".join("\t".join(row) for row in [columns, *rows]) + "\n"
    path = directory / "summary.tsv"
    path.write_text(result, encoding="utf-8")
    print(result, end="")
    print(f"Table: {path}")


def size_lab():
    RESULTS.mkdir(exist_ok=True)
    directory = Path(tempfile.mkdtemp(dir=RESULTS, prefix="footprint-size-"))
    print(f"Size results: {directory}", flush=True)
    image = build_image(directory, "AB")
    values = {name: line.value for name, line in LINES.items()}
    path = directory / "ab.footprint.bin"
    linear = simulate(image, directory, "ab-linear", values, record=path)
    footprint = check_footprint(image, path)
    repeated = simulate(image, directory, "ab-replay", values, replay=path)
    report(directory, [linear, repeated])
    sizes = (
        f"Linear image: {len(image.data)} bytes; footprint: {len(footprint)} bytes; "
        f"saved: {len(image.data) - len(footprint)} bytes"
    )
    (directory / "sizes.txt").write_text(sizes + "\n", encoding="utf-8")
    print(sizes)
    print("Order command: " + shlex.join(["python3", str(Path(__file__).resolve()), "order", str(directory)]))


def order_lab(size_dir):
    size_dir = size_dir.resolve(strict=True)
    require(size_dir.parent == RESULTS.resolve() and size_dir.name.startswith("footprint-size-")
            and (size_dir / "summary.tsv").is_file(), "Use the results directory printed by a successful size run")
    directory = Path(tempfile.mkdtemp(dir=size_dir, prefix="order-"))
    print(f"Order results: {directory}", flush=True)
    old = inspect_image(size_dir / "ab.bin", "AB")
    old_path = size_dir / "ab.footprint.bin"
    old_footprint = check_footprint(old, old_path)
    values = {name: line.value for name, line in LINES.items()}
    check_commits(old, size_dir / "ab-linear.log", old.path, values)

    new = build_image(directory, "BA")
    swapped = bytearray(old.data)
    first, second = old.load_offsets["A"], old.load_offsets["B"]
    swapped[first:first + 4] = old.data[second:second + 4]
    swapped[second:second + 4] = old.data[first:first + 4]
    require(new.data == swapped, f"The two images must differ only in load order. See {directory}")
    new_path = directory / "ba-fresh.footprint.bin"
    linear = simulate(new, directory, "ba-linear", values, record=new_path)
    new_footprint = check_footprint(new, new_path)

    # Keep the B->A instructions and supply the data words in their old A->B order.
    mixed = directory / "ba-old-data.footprint.bin"
    mixed.write_bytes(new_footprint[:LINE_SIZE] + old_footprint[LINE_SIZE:])
    old_values = {"A": values["B"], "B": values["A"]}
    old_data = simulate(new, directory, "ba-old-data", old_values, replay=mixed)
    fresh_data = simulate(new, directory, "ba-fresh", values, replay=new_path)
    require(old_path.read_bytes() == old_footprint, f"Original A->B footprint changed: {old_path}")
    report(directory, [linear, old_data, fresh_data])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("size", help="record and replay the 4 KiB A->B image")
    order = commands.add_parser("order", help="compare the old and new data footprints in B->A order")
    order.add_argument("size_dir", type=Path)
    args = parser.parse_args()
    try:
        require(os.access(EMU, os.X_OK) and SPIKE.is_file(), f"Rocket emulator or Spike library missing in {LAB}")
        if args.command == "size":
            size_lab()
        else:
            order_lab(args.size_dir)
    except (LabError, OSError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

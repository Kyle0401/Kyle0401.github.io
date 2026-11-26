#!/usr/bin/env bash
set -euo pipefail

usage() {
    printf 'Usage: bash %s EMU REF [IMAGE] [OUTPUT_DIR]\n' "${0##*/}"
    printf '%s\n' 'EMU is the SUB fault-injection simulator built with EMU_TRACE=fst.' \
        'REF is the NEMU DiffTest reference library.' \
        'IMAGE defaults to ../01-DiffTest/registers-drain.bin beside this script.' \
        'The replay log and FST are saved in a fresh directory under OUTPUT_DIR.'
}

if [[ $# -eq 1 && ( $1 == -h || $1 == --help ) ]]; then
    usage
    exit 0
fi
if [[ $# -lt 2 || $# -gt 4 ]]; then
    usage >&2
    exit 2
fi

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
emu=$1
reference=$2
image=${3:-"$script_dir/../01-DiffTest/registers-drain.bin"}
output_dir=${4:-${TMPDIR:-/tmp}}

if [[ ! -f "$emu" || ! -x "$emu" || ! -f "$reference" || ! -r "$reference" || ! -f "$image" || ! -r "$image" ]]; then
    printf '%s\n' 'The emulator must be executable and the reference and image must be readable files.' >&2
    exit 2
fi
emu=$(realpath -- "$emu")
reference=$(realpath -- "$reference")
image=$(realpath -- "$image")
mkdir -p -- "$output_dir"
run_dir=$(mktemp -d -- "$(realpath -- "$output_dir")/lightsss-replay.XXXXXX")
mkdir -- "$run_dir/build"
log="$run_dir/nutshell-sub-replay.log"
args=(-i "$image" --diff "$reference" --ram-size 128MB -C 5000 -I 64 -b 0 -e 0 --enable-fork)

status=0
NOOP_HOME="$run_dir" "$emu" "${args[@]}" > "$log" 2>&1 || status=$?

# The controlled discrepancy is expected from the parent and from replay.
mismatches=$(grep -Ec 't2 different at pc = 0x[[:xdigit:]]+, right = 0x0*3, wrong = 0x0*2' "$log" || true)
wave=$(find "$run_dir/build" -maxdepth 1 -type f -name '*.fst' -size +0c -print -quit)
if [[ $status -ne 1 || $mismatches -lt 2 || -z "$wave" ]] || ! grep -q 'checkpoint start to dump wave' "$log"; then
    printf 'Replay verification failed (emulator exit=%s, matching reports=%s). Log: %s\n' \
        "$status" "$mismatches" "$log" >&2
    exit 1
fi

printf 'Verified parent and replay discrepancies (reference=3, DUT=2).\nLog: %s\nFST: %s\n' "$log" "$wave"

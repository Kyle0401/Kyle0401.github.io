"""Record and replay a fixed, read-only memory trace."""


def record_footprint(memory, trace):
    seen = set()
    footprint = bytearray()
    for address in trace:
        if address not in seen:
            seen.add(address)
            footprint.append(memory[address])
    return bytes(footprint)


def replay_footprint(footprint, trace):
    assigned = {}
    reads = bytearray()
    consumed = 0
    for address in trace:
        if address not in assigned:
            if consumed == len(footprint):
                raise ValueError(f"No footprint byte left for address 0x{address:02X}")
            assigned[address] = footprint[consumed]
            consumed += 1
        reads.append(assigned[address])
    return bytes(reads), consumed


def main():
    memory = {0x10: 0xA1, 0x11: 0xB2, 0x12: 0xC3, 0x13: 0xD4}
    original_trace = [0x12, 0x10, 0x12, 0x13]
    shorter_trace = original_trace[:-1]
    reordered_trace = [0x10, 0x12, 0x12, 0x13]

    linear_image = bytes(memory[address] for address in sorted(memory))
    footprint = record_footprint(memory, original_trace)
    reordered_footprint = record_footprint(memory, reordered_trace)
    print(f"Linear image ({len(linear_image)} bytes): {linear_image.hex(' ').upper()}")
    print(f"Recorded footprint ({len(footprint)} bytes): {footprint.hex(' ').upper()}")

    traces = (
        ("Original trace", original_trace, footprint),
        ("Shorter trace", shorter_trace, footprint),
        ("Reordered trace", reordered_trace, footprint),
        ("Reordered trace with fresh footprint", reordered_trace, reordered_footprint),
    )
    for label, trace, input_footprint in traces:
        linear_reads = bytes(memory[address] for address in trace)
        footprint_reads, consumed = replay_footprint(input_footprint, trace)

        print()
        print(f"{label}: " + " -> ".join(f"0x{address:02X}" for address in trace))
        print(f"  Input footprint: {input_footprint.hex(' ').upper()}")
        print(f"  Linear reads: {linear_reads.hex(' ').upper()}")
        print(f"  Footprint replay: {footprint_reads.hex(' ').upper()}")
        print(f"  Unused footprint bytes: {len(input_footprint) - consumed}")
        print(f"  Matches linear reads: {footprint_reads == linear_reads}")


if __name__ == "__main__":
    main()

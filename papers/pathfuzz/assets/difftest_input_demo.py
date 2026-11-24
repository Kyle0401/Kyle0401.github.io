"""Compare address-based input sharing for two fixed, read-only traces."""

from footprint_demo import replay_footprint


def main():
    footprint = bytes.fromhex("C3 A1")
    dut_trace = [0x12, 0x10]
    ref_trace = [0x10, 0x12]

    dut_reads, _ = replay_footprint(footprint, dut_trace)
    dut_memory = dict(zip(dut_trace, dut_reads))

    independent_reads, _ = replay_footprint(footprint, ref_trace)
    independent_ref_memory = dict(zip(ref_trace, independent_reads))

    # This toy runs the DUT trace first, so both assigned bytes are ready to copy.
    ref_input_memory = dut_memory.copy()
    synced_ref_memory = {address: ref_input_memory[address] for address in ref_trace}

    print(f"Input footprint: {footprint.hex(' ').upper()}")
    for label, trace in (("DUT", dut_trace), ("REF", ref_trace)):
        print(f"{label} trace: " + " -> ".join(f"0x{address:02X}" for address in trace))
    print()
    for address in ref_trace:
        print(
            f"0x{address:02X}: DUT={dut_memory[address]:02X}, "
            f"REF independent={independent_ref_memory[address]:02X}, "
            f"REF synced={synced_ref_memory[address]:02X}"
        )
    print()
    print(f"Independent REF matches DUT by address: {independent_ref_memory == dut_memory}")
    print(f"Synced REF matches DUT by address: {synced_ref_memory == dut_memory}")


if __name__ == "__main__":
    main()

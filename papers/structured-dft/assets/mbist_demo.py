"""Teaching model of two SRAM faults on a four-address, one-bit memory."""

import argparse


ADDRESSES = range(4)
FAULT_ADDRESS = 2


class Sram:
    def __init__(self, fault="healthy"):
        self.cells = [0] * len(ADDRESSES)
        self.fault = fault
        self.previous_zero_write = False

    def write(self, address, bit):
        targets_fault = address == FAULT_ADDRESS
        zero_write = targets_fault and bit == 0 and self.cells[address] == 0
        triggered = self.fault == "dwdf" and self.previous_zero_write and zero_write
        self.previous_zero_write = zero_write

        if self.fault == "stuck-at-0" and targets_fault:
            self.cells[address] = 0
        elif triggered:
            self.cells[address] = 1
        else:
            self.cells[address] = bit
        return triggered

    def read(self, address):
        self.previous_zero_write = False
        return self.cells[address]


def run_stuck_at():
    for fault in ("healthy", "stuck-at-0"):
        sram = Sram(fault)
        for pattern, bit in (("A", 0), ("B", 1)):
            for address in ADDRESSES:
                sram.write(address, bit)

            values = [sram.read(address) for address in ADDRESSES]
            reads = " ".join(str(value) for value in values)
            print(f"{fault} {pattern}: write={bit}; reads[0..3]={reads}")

            mismatches = [address for address in ADDRESSES if values[address] != bit]
            if mismatches:
                for address in mismatches:
                    print(f"  FAIL addr={address} expected={bit} actual={values[address]}")
            else:
                print("  PASS")


def run_dwdf_case(fault, zero_writes):
    sram = Sram(fault)
    for address in ADDRESSES:
        sram.write(address, 0)

    sequence = "single-write control" if zero_writes == 1 else "M1 prefix"
    print(f"{fault}: M0=w0 at all addresses; {sequence} at addr={FAULT_ADDRESS}")
    actual = sram.read(FAULT_ADDRESS)
    print(f"  r0 before writes: expected=0 actual={actual}")
    for step in range(1, zero_writes + 1):
        triggered = sram.write(FAULT_ADDRESS, 0)
        message = "fault triggered" if triggered else "no fault triggered"
        print(f"  w0 #{step}: {message}")

    actual = sram.read(FAULT_ADDRESS)
    result = "PASS" if actual == 0 else "FAIL"
    print(f"  r0 after writes: expected=0 actual={actual} {result}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("lesson", nargs="?", choices=("stuck-at", "dwdf"), default="stuck-at")
    args = parser.parse_args()

    if args.lesson == "stuck-at":
        run_stuck_at()
    else:
        # Fig. 8 starts M1 with r0,w0,w0,r0. Keep one w0 as a control.
        run_dwdf_case("healthy", zero_writes=2)
        run_dwdf_case("dwdf", zero_writes=1)
        run_dwdf_case("dwdf", zero_writes=2)


if __name__ == "__main__":
    main()

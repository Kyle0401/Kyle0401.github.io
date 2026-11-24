    .section .text
    .option norvc
    .option norelax

    .ifndef B_FIRST
    .equ B_FIRST, 0
    .endif

    .globl _start, load_a, load_b, good_trap
    .type _start, @function
_start:
    la t0, data_a
    la t1, data_b
    .if B_FIRST
load_b:
    ld t3, 0(t1)
    fence rw, rw
load_a:
    ld t2, 0(t0)
    .else
load_a:
    ld t2, 0(t0)
    fence rw, rw
load_b:
    ld t3, 0(t1)
    .endif

    addi a0, zero, 0
good_trap:
    # Stop the Rocket DiffTest harness after both load results have committed.
    .word 0x0000006b
.Lhalt:
    j .Lhalt
    .size _start, .-_start

    .org 0x40, 0
    # Give each data line a distinct value in every 64-bit word.
    .org 0x400, 0xa5
data_a:
    .rept 8
    .quad 0x11
    .endr

    .org 0x800, 0xa5
data_b:
    .rept 8
    .quad 0x22
    .endr

    .org 0x1000, 0xa5

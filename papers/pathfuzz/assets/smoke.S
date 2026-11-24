    .section .text
    .option norvc
    .option norelax
    .globl _start
    .type _start, @function
_start:
    addi t0, zero, 8
    addi t1, zero, 5
    sub t2, t0, t1
    addi t3, zero, 3
    bne t2, t3, .Lfail
    addi a0, zero, 0
    # Rocket's DiffTest harness treats this instruction as a successful exit.
    .word 0x0000006b
.Lfail:
    j .Lfail
    .size _start, .-_start

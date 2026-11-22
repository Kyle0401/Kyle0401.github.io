#ifndef CONFIG_NO_DIFFTEST

#include "difftest.h"
#include "difftest-dpic.h"
#include "difftest-query.h"
#ifdef CONFIG_DIFFTEST_PERFCNT
#include "perf.h"
#endif // CONFIG_DIFFTEST_PERFCNT


DiffStateBuffer** diffstate_buffer = nullptr;
#define DUT_BUF(core_id, zone, index) (diffstate_buffer[core_id]->get(zone, index))

void diffstate_buffer_init() {
  diffstate_buffer = new DiffStateBuffer*[NUM_CORES];
  for (int i = 0; i < NUM_CORES; i++) {
    diffstate_buffer[i] = new DPICBuffer(i);
  }

}

void diffstate_buffer_free() {
  for (int i = 0; i < NUM_CORES; i++) {
    delete diffstate_buffer[i];
  }
  delete[] diffstate_buffer;
  diffstate_buffer = nullptr;

}


#ifdef CONFIG_DIFFTEST_PERFCNT
enum DIFFSTATE_PERF {
  perf_v_difftest_CSRState,
  perf_v_difftest_ArchEvent,
  perf_v_difftest_TrapEvent,
  perf_v_difftest_InstrCommit,
  perf_v_difftest_ArchIntRegState,
  perf_v_difftest_CommitData,
  DIFFSTATE_PERF_NUM
};
long long dpic_calls[DIFFSTATE_PERF_NUM] = {0}, dpic_bytes[DIFFSTATE_PERF_NUM] = {0};
void diffstate_perfcnt_init() {
  for (int i = 0; i < DIFFSTATE_PERF_NUM; i++) {
    dpic_calls[i] = 0;
    dpic_bytes[i] = 0;
  }
}
void diffstate_perfcnt_finish(long long msec) {
  long long calls_sum = 0, bytes_sum = 0;
  const char *dpic_name[DIFFSTATE_PERF_NUM] = {
    "v_difftest_CSRState",
    "v_difftest_ArchEvent",
    "v_difftest_TrapEvent",
    "v_difftest_InstrCommit",
    "v_difftest_ArchIntRegState",
    "v_difftest_CommitData"
  };
  for (int i = 0; i < DIFFSTATE_PERF_NUM; i++) {
    difftest_perfcnt_print(dpic_name[i], dpic_calls[i], dpic_bytes[i], msec);
  }
  for (int i = 0; i < DIFFSTATE_PERF_NUM; i++) {
    calls_sum += dpic_calls[i];
    bytes_sum += dpic_bytes[i];
  }
  difftest_perfcnt_print("DIFFSTATE_SUM", calls_sum, bytes_sum, msec);
}
#endif // CONFIG_DIFFTEST_PERFCNT



extern "C" void v_difftest_CSRState (
  uint64_t io_privilegeMode,
  uint64_t io_mstatus,
  uint64_t io_sstatus,
  uint64_t io_mepc,
  uint64_t io_sepc,
  uint64_t io_mtval,
  uint64_t io_stval,
  uint64_t io_mtvec,
  uint64_t io_stvec,
  uint64_t io_mcause,
  uint64_t io_scause,
  uint64_t io_satp,
  uint64_t io_mip,
  uint64_t io_mie,
  uint64_t io_mscratch,
  uint64_t io_sscratch,
  uint64_t io_mideleg,
  uint64_t io_medeleg,
  uint8_t  io_coreid
) {
  if (!diffstate_buffer) return;

#ifdef CONFIG_DIFFTEST_PERFCNT
  dpic_calls[perf_v_difftest_CSRState] ++;
  dpic_bytes[perf_v_difftest_CSRState] += 145;
#endif // CONFIG_DIFFTEST_PERFCNT

  auto packet = &(DUT_BUF(io_coreid, 0, 0)->regs.csr);
  packet->privilegeMode = io_privilegeMode;
  packet->mstatus = io_mstatus;
  packet->sstatus = io_sstatus;
  packet->mepc = io_mepc;
  packet->sepc = io_sepc;
  packet->mtval = io_mtval;
  packet->stval = io_stval;
  packet->mtvec = io_mtvec;
  packet->stvec = io_stvec;
  packet->mcause = io_mcause;
  packet->scause = io_scause;
  packet->satp = io_satp;
  packet->mip = io_mip;
  packet->mie = io_mie;
  packet->mscratch = io_mscratch;
  packet->sscratch = io_sscratch;
  packet->mideleg = io_mideleg;
  packet->medeleg = io_medeleg;

#ifdef CONFIG_DIFFTEST_QUERY
  qStats->CSRState_write(0, io_coreid, packet);
#endif // CONFIG_DIFFTEST_QUERY

}


extern "C" void v_difftest_ArchEvent (
  uint32_t io_interrupt,
  uint32_t io_exception,
  uint64_t io_exceptionPC,
  uint32_t io_exceptionInst,
  uint8_t  io_hasNMI,
  uint8_t  io_virtualInterruptIsHvictlInject,
  uint8_t  io_irToHS,
  uint8_t  io_irToVS,
  uint8_t  io_coreid
) {
  if (!diffstate_buffer) return;

#ifdef CONFIG_DIFFTEST_PERFCNT
  dpic_calls[perf_v_difftest_ArchEvent] ++;
  dpic_bytes[perf_v_difftest_ArchEvent] += 21;
#endif // CONFIG_DIFFTEST_PERFCNT

  auto packet = &(DUT_BUF(io_coreid, 0, 0)->event);
  packet->valid = true;
  packet->interrupt = io_interrupt;
  packet->exception = io_exception;
  packet->exceptionPC = io_exceptionPC;
  packet->exceptionInst = io_exceptionInst;
  packet->hasNMI = io_hasNMI;
  packet->virtualInterruptIsHvictlInject = io_virtualInterruptIsHvictlInject;
  packet->irToHS = io_irToHS;
  packet->irToVS = io_irToVS;

#ifdef CONFIG_DIFFTEST_QUERY
  qStats->ArchEvent_write(0, io_coreid, packet);
#endif // CONFIG_DIFFTEST_QUERY

}


extern "C" void v_difftest_TrapEvent (
  uint8_t  io_hasTrap,
  uint64_t io_cycleCnt,
  uint64_t io_instrCnt,
  uint8_t  io_hasWFI,
  uint64_t io_code,
  uint64_t io_pc,
  uint8_t  io_coreid
) {
  if (!diffstate_buffer) return;

#ifdef CONFIG_DIFFTEST_PERFCNT
  dpic_calls[perf_v_difftest_TrapEvent] ++;
  dpic_bytes[perf_v_difftest_TrapEvent] += 33;
#endif // CONFIG_DIFFTEST_PERFCNT

  auto packet = &(DUT_BUF(io_coreid, 0, 0)->trap);
  packet->hasTrap = io_hasTrap;
  packet->cycleCnt = io_cycleCnt;
  packet->instrCnt = io_instrCnt;
  packet->hasWFI = io_hasWFI;
  packet->code = io_code;
  packet->pc = io_pc;

#ifdef CONFIG_DIFFTEST_QUERY
  qStats->TrapEvent_write(0, io_coreid, packet);
#endif // CONFIG_DIFFTEST_QUERY

}


extern "C" void v_difftest_InstrCommit (
  uint8_t  io_skip,
  uint8_t  io_isRVC,
  uint8_t  io_rfwen,
  uint8_t  io_fpwen,
  uint8_t  io_vecwen,
  uint8_t  io_v0wen,
  uint8_t  io_wpdest,
  uint8_t  io_wdest,
  uint8_t  io_otherwpdest_0,
  uint8_t  io_otherwpdest_1,
  uint8_t  io_otherwpdest_2,
  uint8_t  io_otherwpdest_3,
  uint8_t  io_otherwpdest_4,
  uint8_t  io_otherwpdest_5,
  uint8_t  io_otherwpdest_6,
  uint8_t  io_otherwpdest_7,
  uint8_t  io_otherwpdest_8,
  uint8_t  io_otherwpdest_9,
  uint8_t  io_otherwpdest_10,
  uint8_t  io_otherwpdest_11,
  uint8_t  io_otherwpdest_12,
  uint8_t  io_otherwpdest_13,
  uint8_t  io_otherwpdest_14,
  uint8_t  io_otherwpdest_15,
  uint64_t io_pc,
  uint32_t io_instr,
  uint16_t io_robIdx,
  uint8_t  io_lqIdx,
  uint8_t  io_sqIdx,
  uint8_t  io_isLoad,
  uint8_t  io_isStore,
  uint8_t  io_nFused,
  uint8_t  io_special,
  uint8_t  io_coreid,
  uint8_t  io_index
) {
  if (!diffstate_buffer) return;

#ifdef CONFIG_DIFFTEST_PERFCNT
  dpic_calls[perf_v_difftest_InstrCommit] ++;
  dpic_bytes[perf_v_difftest_InstrCommit] += 18;
#endif // CONFIG_DIFFTEST_PERFCNT

  auto packet = &(DUT_BUF(io_coreid, 0, 0)->commit[io_index]);
  packet->valid = true;
  packet->skip = io_skip;
  packet->isRVC = io_isRVC;
  packet->rfwen = io_rfwen;
  packet->fpwen = io_fpwen;
  packet->vecwen = io_vecwen;
  packet->v0wen = io_v0wen;
  packet->wpdest = io_wpdest;
  packet->wdest = io_wdest;
  packet->otherwpdest[0] = io_otherwpdest_0;
  packet->otherwpdest[1] = io_otherwpdest_1;
  packet->otherwpdest[2] = io_otherwpdest_2;
  packet->otherwpdest[3] = io_otherwpdest_3;
  packet->otherwpdest[4] = io_otherwpdest_4;
  packet->otherwpdest[5] = io_otherwpdest_5;
  packet->otherwpdest[6] = io_otherwpdest_6;
  packet->otherwpdest[7] = io_otherwpdest_7;
  packet->otherwpdest[8] = io_otherwpdest_8;
  packet->otherwpdest[9] = io_otherwpdest_9;
  packet->otherwpdest[10] = io_otherwpdest_10;
  packet->otherwpdest[11] = io_otherwpdest_11;
  packet->otherwpdest[12] = io_otherwpdest_12;
  packet->otherwpdest[13] = io_otherwpdest_13;
  packet->otherwpdest[14] = io_otherwpdest_14;
  packet->otherwpdest[15] = io_otherwpdest_15;
  packet->pc = io_pc;
  packet->instr = io_instr;
  packet->robIdx = io_robIdx;
  packet->lqIdx = io_lqIdx;
  packet->sqIdx = io_sqIdx;
  packet->isLoad = io_isLoad;
  packet->isStore = io_isStore;
  packet->nFused = io_nFused;
  packet->special = io_special;

#ifdef CONFIG_DIFFTEST_QUERY
  qStats->InstrCommit_write(0, io_coreid, io_index, packet);
#endif // CONFIG_DIFFTEST_QUERY

}


extern "C" void v_difftest_ArchIntRegState (
  uint64_t io_value_0,
  uint64_t io_value_1,
  uint64_t io_value_2,
  uint64_t io_value_3,
  uint64_t io_value_4,
  uint64_t io_value_5,
  uint64_t io_value_6,
  uint64_t io_value_7,
  uint64_t io_value_8,
  uint64_t io_value_9,
  uint64_t io_value_10,
  uint64_t io_value_11,
  uint64_t io_value_12,
  uint64_t io_value_13,
  uint64_t io_value_14,
  uint64_t io_value_15,
  uint64_t io_value_16,
  uint64_t io_value_17,
  uint64_t io_value_18,
  uint64_t io_value_19,
  uint64_t io_value_20,
  uint64_t io_value_21,
  uint64_t io_value_22,
  uint64_t io_value_23,
  uint64_t io_value_24,
  uint64_t io_value_25,
  uint64_t io_value_26,
  uint64_t io_value_27,
  uint64_t io_value_28,
  uint64_t io_value_29,
  uint64_t io_value_30,
  uint64_t io_value_31,
  uint8_t  io_coreid
) {
  if (!diffstate_buffer) return;

#ifdef CONFIG_DIFFTEST_PERFCNT
  dpic_calls[perf_v_difftest_ArchIntRegState] ++;
  dpic_bytes[perf_v_difftest_ArchIntRegState] += 257;
#endif // CONFIG_DIFFTEST_PERFCNT

  auto packet = &(DUT_BUF(io_coreid, 0, 0)->regs.xrf);
  packet->value[0] = io_value_0;
  packet->value[1] = io_value_1;
  packet->value[2] = io_value_2;
  packet->value[3] = io_value_3;
  packet->value[4] = io_value_4;
  packet->value[5] = io_value_5;
  packet->value[6] = io_value_6;
  packet->value[7] = io_value_7;
  packet->value[8] = io_value_8;
  packet->value[9] = io_value_9;
  packet->value[10] = io_value_10;
  packet->value[11] = io_value_11;
  packet->value[12] = io_value_12;
  packet->value[13] = io_value_13;
  packet->value[14] = io_value_14;
  packet->value[15] = io_value_15;
  packet->value[16] = io_value_16;
  packet->value[17] = io_value_17;
  packet->value[18] = io_value_18;
  packet->value[19] = io_value_19;
  packet->value[20] = io_value_20;
  packet->value[21] = io_value_21;
  packet->value[22] = io_value_22;
  packet->value[23] = io_value_23;
  packet->value[24] = io_value_24;
  packet->value[25] = io_value_25;
  packet->value[26] = io_value_26;
  packet->value[27] = io_value_27;
  packet->value[28] = io_value_28;
  packet->value[29] = io_value_29;
  packet->value[30] = io_value_30;
  packet->value[31] = io_value_31;

#ifdef CONFIG_DIFFTEST_QUERY
  qStats->ArchIntRegState_write(0, io_coreid, packet);
#endif // CONFIG_DIFFTEST_QUERY

}


extern "C" void v_difftest_CommitData (
  uint64_t io_data,
  uint8_t  io_coreid,
  uint8_t  io_index
) {
  if (!diffstate_buffer) return;

#ifdef CONFIG_DIFFTEST_PERFCNT
  dpic_calls[perf_v_difftest_CommitData] ++;
  dpic_bytes[perf_v_difftest_CommitData] += 10;
#endif // CONFIG_DIFFTEST_PERFCNT

  auto packet = &(DUT_BUF(io_coreid, 0, 0)->commit_data[io_index]);
  packet->valid = true;
  packet->data = io_data;

#ifdef CONFIG_DIFFTEST_QUERY
  qStats->CommitData_write(0, io_coreid, io_index, packet);
#endif // CONFIG_DIFFTEST_QUERY

}


#endif // CONFIG_NO_DIFFTEST

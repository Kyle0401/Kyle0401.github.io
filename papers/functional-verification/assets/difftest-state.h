#ifndef __DIFFTEST_STATE_H__
#define __DIFFTEST_STATE_H__

#include <cstdint>

#define CONFIG_DIFFTEST_DPIC
#define CONFIG_DIFFTEST_ZONESIZE 1
#define CONFIG_DIFFTEST_BUFLEN 1

#define CPU_NUTSHELL


#ifndef NUM_CORES
#define NUM_CORES 1
#endif

#define CONFIG_DIFFTEST_COMMITDATA
#define CONFIG_DIFF_COMMIT_DATA_WIDTH 1
typedef struct  {
  uint8_t  valid;
  uint64_t data;
} DifftestCommitData;

#define CONFIG_DIFFTEST_CSRSTATE
typedef struct  {
  uint64_t privilegeMode;
  uint64_t mstatus;
  uint64_t sstatus;
  uint64_t mepc;
  uint64_t sepc;
  uint64_t mtval;
  uint64_t stval;
  uint64_t mtvec;
  uint64_t stvec;
  uint64_t mcause;
  uint64_t scause;
  uint64_t satp;
  uint64_t mip;
  uint64_t mie;
  uint64_t mscratch;
  uint64_t sscratch;
  uint64_t mideleg;
  uint64_t medeleg;
} DifftestCSRState;

#define CONFIG_DIFFTEST_TRAPEVENT
typedef struct  {
  uint8_t  hasTrap;
  uint64_t cycleCnt;
  uint64_t instrCnt;
  uint8_t  hasWFI;
  uint64_t code;
  uint64_t pc;
} DifftestTrapEvent;

#define CONFIG_DIFFTEST_INSTRCOMMIT
#define CONFIG_DIFF_COMMIT_WIDTH 1
typedef struct  {
  uint8_t  valid;
  uint8_t  skip;
  uint8_t  isRVC;
  uint8_t  rfwen;
  uint8_t  fpwen;
  uint8_t  vecwen;
  uint8_t  v0wen;
  uint8_t  wpdest;
  uint8_t  wdest;
  uint8_t  otherwpdest[16];
  uint64_t pc;
  uint32_t instr;
  uint16_t robIdx;
  uint8_t  lqIdx;
  uint8_t  sqIdx;
  uint8_t  isLoad;
  uint8_t  isStore;
  uint8_t  nFused;
  uint8_t  special;
} DifftestInstrCommit;

#define CONFIG_DIFFTEST_ARCHEVENT
typedef struct  {
  uint8_t  valid;
  uint32_t interrupt;
  uint32_t exception;
  uint64_t exceptionPC;
  uint32_t exceptionInst;
  uint8_t  hasNMI;
  uint8_t  virtualInterruptIsHvictlInject;
  uint8_t  irToHS;
  uint8_t  irToVS;
} DifftestArchEvent;

#define CONFIG_DIFFTEST_ARCHINTREGSTATE
typedef struct  {
  uint64_t value[32];
} DifftestArchIntRegState;

typedef struct {
  DifftestArchIntRegState        xrf;
  DifftestCSRState               csr;
} DiffTestRegState;

typedef struct {
  DiffTestRegState regs;
  DifftestArchEvent              event;
  DifftestCommitData             commit_data[1];
  DifftestInstrCommit            commit[1];
  DifftestTrapEvent              trap;
} DiffTestState;


class DiffStateBuffer {
public:
  virtual ~DiffStateBuffer() {}
  virtual DiffTestState* get(int zone, int index) = 0;
  virtual DiffTestState* next() = 0;
  virtual void switch_zone() = 0;
};

extern DiffStateBuffer** diffstate_buffer;

extern void diffstate_buffer_init();
extern void diffstate_buffer_free();


#ifdef CONFIG_DIFFTEST_PERFCNT
void diffstate_perfcnt_init();
void diffstate_perfcnt_finish(long long msec);
#endif // CONFIG_DIFFTEST_PERFCNT


#ifdef CONFIG_DIFFTEST_QUERY
void difftest_query_init();
void difftest_query_step();
void difftest_query_finish();
#endif // CONFIG_DIFFTEST_QUERY

#endif // __DIFFTEST_STATE_H__

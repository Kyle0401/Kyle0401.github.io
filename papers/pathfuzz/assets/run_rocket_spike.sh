#!/usr/bin/env bash
set -euo pipefail
export LC_ALL=C

lab_root="$HOME/pathfuzz-rocket-spike-lab"
rocket_dir="$lab_root/rocket-chip"
emulator="$rocket_dir/build/emu"
spike_build="$lab_root/riscv-isa-sim/difftest/build"
spike_ref="$spike_build/riscv64-spike-so"
smoke_image="$lab_root/smoke.bin"
results_dir="$lab_root/results"
cycle_limit=100000
sub_pattern='commit pc 0*80000008 inst 406283b3 wen 1 dst 0*7 data 0*3([[:space:]]|$)'

fail() {
    printf 'Error: %s\n' "$*" >&2
    exit 1
}

check_build() {
    [[ -x "$emulator" ]] || fail "Rocket emulator is missing: $emulator"
    [[ -s "$spike_ref" ]] || fail "Spike reference library is missing: $spike_ref"
}

simulate() {
    local log=$1
    shift

    if (
        cd "$rocket_dir"
        export PATH="$spike_build:$PATH"
        NOOP_HOME="$rocket_dir" timeout 90s "$emulator" \
            --diff="$spike_ref" --seed=0 --ram-size=128MB \
            --max-cycles="$cycle_limit" --log-begin=0 --log-end="$cycle_limit" \
            --dump-commit-trace "$@"
    ) >"$log" 2>&1; then
        return
    else
        local status=$?
        tail -n 30 -- "$log" >&2
        fail "Simulation exited with status $status. See $log"
    fi
}

verify_commit() {
    local log=$1
    local clean_log="$log.clean"
    local commit

    sed -E 's/\x1b\[[0-9;]*m//g' "$log" >"$clean_log"
    grep -Fxq -- "The reference model is $spike_ref" "$clean_log" ||
        fail "Spike reference library was not confirmed in $log"
    grep -Fq -- 'Difftest enabled' "$clean_log" || fail "DiffTest did not start in $log"
    grep -Fq -- 'HIT GOOD TRAP' "$clean_log" || fail "No successful halt in $log"
    grep -Fq -- 'different at pc' "$clean_log" && fail "DiffTest reported a mismatch in $log"
    commit=$(grep -Eio -- "$sub_pattern" "$clean_log") ||
        fail "Expected SUB writeback t2=3 is missing from $log"
    [[ "$commit" != *$'\n'* ]] || fail "Found multiple SUB writebacks in $log"
    printf '%s\n' "${commit% }"
}

footprint_hash() {
    sha256sum -- "$1" | cut -d ' ' -f 1
}

record() {
    [[ -s "$smoke_image" ]] || fail "Fixed arithmetic test image is missing: $smoke_image"
    mkdir -p -- "$results_dir"
    local run_dir footprint commit
    run_dir=$(mktemp -d "$results_dir/run-XXXXXXXX")
    footprint="$run_dir/footprint.bin"
    printf 'Record directory: %s\n' "$run_dir"

    simulate "$run_dir/linear.log" --image="$smoke_image" --dump-footprints="$footprint"
    commit=$(verify_commit "$run_dir/linear.log")
    [[ -s "$footprint" ]] || fail "The simulator did not record a footprint. See $run_dir/linear.log"
    printf '%s\n' "$commit" > "$run_dir/linear-sub.txt"
    footprint_hash "$footprint" > "$run_dir/footprint.sha256"

    printf 'Linear SUB: %s\n' "$commit"
    printf 'Linear run: Spike DiffTest enabled, HIT GOOD TRAP\n'
    printf 'Footprint: %s (%s bytes)\n' "$footprint" "$(wc -c < "$footprint")"
    printf 'Linear log: %s\n' "$run_dir/linear.log"
    printf 'Replay command: bash %q replay %q\n' "${BASH_SOURCE[0]}" "$run_dir"
}

replay() {
    local run_dir footprint checksum replay_dir commit original_commit
    run_dir=$(realpath -e -- "$1") || fail "Record directory not found: $1"
    [[ "$(dirname -- "$run_dir")" == "$results_dir" && "$(basename -- "$run_dir")" == run-* ]] ||
        fail "Select the record directory printed by this lab"
    footprint="$run_dir/footprint.bin"
    [[ -s "$footprint" && -s "$run_dir/linear-sub.txt" && -s "$run_dir/footprint.sha256" ]] ||
        fail "Record is incomplete: $run_dir"
    checksum=$(< "$run_dir/footprint.sha256")
    [[ "$(footprint_hash "$footprint")" == "$checksum" ]] || fail "The recorded footprint changed"

    replay_dir=$(mktemp -d "$run_dir/replay-XXXXXXXX")
    printf 'Replay directory: %s\n' "$replay_dir"
    simulate "$replay_dir/replay.log" --image="$footprint" --as-footprints
    grep -Fxq -- "The image is $footprint" "$replay_dir/replay.log" ||
        fail "The simulator did not confirm loading $footprint"
    [[ "$(footprint_hash "$footprint")" == "$checksum" ]] || fail "The footprint changed during replay"
    commit=$(verify_commit "$replay_dir/replay.log")
    original_commit=$(< "$run_dir/linear-sub.txt")
    [[ "$commit" == "$original_commit" ]] || fail "The linear and replay SUB commits differ"

    printf 'Linear SUB: %s\n' "$original_commit"
    printf 'Replay SUB: %s\n' "$commit"
    printf 'Replay run: Spike DiffTest enabled, HIT GOOD TRAP\n'
    printf 'Replay log: %s\n' "$replay_dir/replay.log"
    printf 'PASS: Spike checked both runs, the SUB writebacks match, and the recorded footprint is unchanged.\n'
}

case "${1:-}" in
    record)
        [[ $# -eq 1 ]] || fail "Usage: bash $0 record"
        check_build
        record
        ;;
    replay)
        [[ $# -eq 2 ]] || fail "Usage: bash $0 replay <record-directory>"
        check_build
        replay "$2"
        ;;
    *)
        printf 'Usage: bash %s record | replay <record-directory>\n' "$0" >&2
        exit 2
        ;;
esac

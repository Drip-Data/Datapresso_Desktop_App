DIM=1024 # decide which dimension to use
GRADIENT_PATH=../grads/llama3-1b-p0.05-lora-seed3/{}-ckpt{}-adam/dim${DIM}
TRAIN_FILE_NAMES="cot"        # 实际上有4个，另外3个分别是flan-v2，cot，oasst1
CKPTS="212 424 636 844" # checkpoing index
CHECKPOINT_WEIGHTS="1.6815e-05 1.2848e-05 7.665e-06 2.531e-06" # average lr of the epoch

VALIDATION_GRADIENT_PATH=../grads/llama3-1b-p0.05-lora-seed3/{}-ckpt{}-sgd/dim${DIM}
TARGET_TASK_NAMES="mmlu"
SELECTED_DATA_OUTPUT_PATH="../selected_data"

./less/scripts/data_selection/matching.sh "$GRADIENT_PATH" "$TRAIN_FILE_NAMES" "$CKPTS" "$CHECKPOINT_WEIGHTS" "$VALIDATION_GRADIENT_PATH" "$TARGET_TASK_NAMES" "$SELECTED_DATA_OUTPUT_PATH"
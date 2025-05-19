
TARGET_TASK_NAMES="mmlu"
TRAIN_FILE_NAMES="cot"
TRAIN_FILES="./data/train/processed/cot/cot_data.jsonl"
SELECTED_DATA_OUTPUT_PATH="../selected_data"
PERCENTAGE=0.1



./less/scripts/data_selection/write_selected_data.sh "$TARGET_TASK_NAMES" "$TRAIN_FILE_NAMES" "$TRAIN_FILES" "$SELECTED_DATA_OUTPUT_PATH" "$PERCENTAGE"
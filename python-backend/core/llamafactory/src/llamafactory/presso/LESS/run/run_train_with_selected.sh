TARGET_TASK_NAME="bbh"
PERCENTAGE=0.1
# TRAIN_FILES=../selected_data/${TARGET_TASK_NAME}/top_p${PERCENTAGE}.jsonl
TRAIN_FILES=./data/train/processed/cot/cot_data.jsonl
MODEL_PATH=/root/autodl-tmp/models/Llama-3.2-1B
LORA_R=128
LORA_ALPHA=512
# JOB_NAME=llama3-1b-less-p${PERCENTAGE}-lora-r${LORA_R}/${TARGET_TASK_NAME}
# JOB_NAME=llama3-1b-random-p${PERCENTAGE}-lora-r${LORA_R}/${TARGET_TASK_NAME}
JOB_NAME=llama3-1b-all-lora-r${LORA_R}/${TARGET_TASK_NAME}

./less/scripts/train/lora_train.sh "$TRAIN_FILES" "$MODEL_PATH" "$JOB_NAME" "$LORA_R" "$LORA_ALPHA"

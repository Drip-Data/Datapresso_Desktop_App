DATA_DIR=./data
MODEL_PATH=/root/autodl-tmp/models/Llama-3.2-1B
PERCENTAGE=0.05 # percentage of the full data to train, you can specify the training file you want to use in the script
DATA_SEED=3
LORA_R=16
LORA_ALPHA=64

JOB_NAME=llama3-1b-p${PERCENTAGE}-lora-seed${DATA_SEED}--lora_r${LORA_R}--lora_alpha${LORA_ALPHA}


./less/scripts/train/warmup_lora_train.sh "$DATA_DIR" "$MODEL_PATH" "$PERCENTAGE" "$DATA_SEED" "$LORA_R" "$LORA_ALPHA" "$JOB_NAME"
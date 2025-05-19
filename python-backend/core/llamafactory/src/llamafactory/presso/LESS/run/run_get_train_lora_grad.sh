CKPT=69

TRAINING_DATA_NAME=cot
TRAINING_DATA_FILE=src/llamafactory/LESS/data/train/processed/cot/cot_data.jsonl # when changing data name, change the data path accordingly
GRADIENT_TYPE="adam"
MODEL_PATH=./saves/llama3-1b/lora/sft/less/checkpoint-${CKPT}
OUTPUT_PATH=./grads/llama3-1b/${TRAINING_DATA_NAME}-ckpt${CKPT}-${GRADIENT_TYPE}
DIMS="1024"

CUDA_VISIBLE_DEVICES=0,1 ./src/llamafactory/LESS/less/scripts/get_info/grad/get_train_lora_grads.sh "$TRAINING_DATA_FILE" "$MODEL_PATH" "$OUTPUT_PATH" "$DIMS" "$GRADIENT_TYPE"

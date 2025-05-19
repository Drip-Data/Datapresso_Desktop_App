CKPT=636
TASK=mmlu
MODEL_PATH=../out/llama3-1b-p0.05-lora-seed3/checkpoint-${CKPT}
OUTPUT_PATH=../grads/llama3-1b-p0.05-lora-seed3/${TASK}-ckpt${CKPT}-sgd # for validation data, we always use sgd
DATA_DIR=./data
DIMS="1024" # We use 8192 as our default projection dimension 

./less/scripts/get_info/grad/get_eval_lora_grads.sh "$TASK" "$DATA_DIR" "$MODEL_PATH" $OUTPUT_PATH "$DIMS
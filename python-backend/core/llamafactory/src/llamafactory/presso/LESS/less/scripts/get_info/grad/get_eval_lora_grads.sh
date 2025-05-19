#!/bin/bash

# for validation data, we should always get gradients with sgd

task=$1 # tydiqa, mmlu
data_dir=$2 # path to data
model=$3 # path to model
output_path=$4 # path to output
dims=$5 # dimension of projection, can be a list

if [[ ! -d $output_path ]]; then
    mkdir -p $output_path
fi

CUDA_VISIBLE_DEVICES=0 accelerate launch --main_process_port=25900 --num_processes=1 -m src.llamafactory.LESS.less.data_selection.get_info \
--task $task \
--info_type grads \
--model_path $model \
--output_path $output_path \
--gradient_projection_dimension $dims \
--gradient_type sgd \
--data_dir $data_dir

#!/bin/bash

train_file=$1 #
model=$2 # path to model
output_path=$3 # path to output
dims=$4 # dimension of projection, can be a list
gradient_type=$5

if [[ ! -d $output_path ]]; then
    mkdir -p $output_path
fi

CUDA_VISIBLE_DEVICES=0,2 accelerate launch --main_process_port=25900 --num_processes=2 -m src.llamafactory.LESS.less.data_selection.get_info \
--train_file $train_file \
--info_type grads \
--model_path $model \
--output_path $output_path \
--gradient_projection_dimension $dims \
--gradient_type $gradient_type

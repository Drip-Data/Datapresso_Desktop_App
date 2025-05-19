#!/bin/bash
target_task_names=$1
train_file_names=$2
train_files=$3
output_path=$4
percentage=$5



if [[ ! -d $output_path ]]; then
    mkdir -p $output_path
fi

python3 -m src.llamafactory.LESS.less.data_selection.write_selected_data \
--target_task_names $target_task_names \
--train_file_names $train_file_names \
--train_files $train_files \
--output_path $output_path \
--percentage $percentage
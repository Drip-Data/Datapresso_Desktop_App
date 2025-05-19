# Copyright 2025 the LlamaFactory team.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import os
import shutil
import json
import argparse
from typing import TYPE_CHECKING, Any, Optional

import torch
import torch.distributed as dist
from transformers import PreTrainedModel
from .LESS import get_avg_lr

import re
import logger
import subprocess
# from .callbacks import LogCallback, PissaConvertCallback, ReporterCallback
from ..hparams import get_infer_args, get_ray_args, get_train_args, read_args

from .LESS.less.data_selection.matching import match
from .LESS.less.data_selection.write_selected_data import write_selected_data
from .cherry.cherry_seletion.data_analysis import data_analysis
from .cherry.cherry_seletion.data_by_cluster import data_by_cluster

def _training_function(config: dict[str, Any]) -> None:
    presso_args = config.get("args")
    # print(args)

    # callbacks: list[Any] = config.get("callbacks")
    # presso_args = get_train_args(args)
    # print(presso_args)
    # callbacks.append(LogCallback())
    # if finetuning_args.pissa_convert:
    #     callbacks.append(PissaConvertCallback())
    #
    # if finetuning_args.use_swanlab:
    #     callbacks.append(get_swanlab_callback(finetuning_args))

    # callbacks.append(ReporterCallback(model_args, data_args, finetuning_args, generating_args))  # add to last
    print(presso_args)
    if presso_args['stage'] == "less":
        run_less(presso_args)
    elif presso_args['stage'] == "cherry":
        run_cherry(presso_args)
    else:
        raise ValueError(f"Unknown task: {presso_args.stage}.")

    try:
        if dist.is_initialized():
            dist.destroy_process_group()
    except Exception as e:
        logger.warning(f"Failed to destroy process group: {e}.")


def run_presso(args: Optional[dict[str, Any]] = None, **kwargs):
    args = read_args(args)
    _training_function(config={"args": args})


def run_cherry(args, **kwargs):
    data_analysis(args)
    data_by_cluster(args)
    current_dir = os.getcwd()

    json_save_path = current_dir + '/src/llamafactory/presso/cherry/select_data/' + args['data_file_name'] + '_pre.json'
    model_path = args['model_path']
    num_train_epochs = args['num_train_epochs']
    bs = args['per_device_train_batch_size']
    save_strategy = args['save_strategy']
    save_steps = args['save_steps']
    save_total_limit = args['save_total_limit']
    entry = current_dir + '/src/llamafactory/' + 'presso/cherry/training/stanford_alpaca/train.py'
    command = (
        f'python {entry} '
        f'--data_path "{json_save_path}" '
        f'--model_name_or_path "{model_path}" '
        f'--output_dir trainer_pre_experienced '
        f'--num_train_epochs {num_train_epochs} '
        f'--per_device_train_batch_size {bs} '
        f'--save_strategy "{save_strategy}" '
        f'--save_steps {save_steps} '
        f'--save_total_limit {save_total_limit} '
        f'--learning_rate 2e-5 '
        f'--logging_steps 10 '
        f'--bf16 True '
        f'--model_max_length 512 '
    )
    os.system(command)


def run_less(args, **kwargs):

    # OUTPUT_DIR = "~/Less_test/saves/llama3-1b/lora_r_64/sft/less"  # checkpoing directory, need the model name be changed
    # CHECKPOINT_DIR = OUTPUT_DIR

    if args['checkpoint_dir']:
        print(args['checkpoint_dir'])
        checkpoints = [os.path.join(args['checkpoint_dir'], d) for d in os.listdir(args['checkpoint_dir'])
                       if os.path.isdir(os.path.join(args['checkpoint_dir'], d)) and d.startswith('checkpoint-')]

        def natural_sort_key(s):
            return [int(text) if text.isdigit() else text.lower()
                    for text in re.split(r'(\d+)', s)]

        checkpoints.sort(key=natural_sort_key)

        # for checkpoint in checkpoints:
        #     print(checkpoint)
    else:
        print("环境变量 CHECKPOINT_DIR 未设置。")

    CKPTS = ""
    CHECKPOINT_WEIGHTS = ""
    checkpoints_weights = []
    ckpt_ids = []

    for checkpoint in checkpoints:
        # 获取检查点 ID
        ckpt_id = os.path.basename(checkpoint).replace('checkpoint-', '')
        print(ckpt_id)
        # 构建日志文件路径
        log_path = os.path.join(checkpoint, args['log_path'])
        if os.path.isfile(log_path):
            try:
                # 调用 Python 脚本获取平均学习率
                # result = subprocess.run(['python', 'src/llamafactory/LESS/get_avg_lr.py', '--log_path', log_path],
                #                         capture_output=True, text=True, check=True)
                #
                # lr = result.stdout.strip()

                lr = get_avg_lr(log_path)
                CKPTS = f"{CKPTS} {ckpt_id}"
                CHECKPOINT_WEIGHTS = f"{CHECKPOINT_WEIGHTS} {lr}"
                ckpt_ids.append(ckpt_id)
                checkpoints_weights.append(lr)

            except subprocess.CalledProcessError as e:
                print(f"Error running get_avg_lr.py: {e.stderr}")
        else:
            print(f"Warning: {log_path} not found for {os.path.basename(checkpoint)}")

    print(CKPTS)
    print(CHECKPOINT_WEIGHTS)
    args['checkpoint_weights'] = checkpoints_weights
    args['ckpts'] = ckpt_ids

    match(args)
    write_selected_data(args)

# if __name__ == "__main__":
#     parser = argparse.ArgumentParser()
#     parser.add_argument("--log_path", type=str, default="")
#     args = parser.parse_args()
#
#     print(get_avg_lr(args.log_path))
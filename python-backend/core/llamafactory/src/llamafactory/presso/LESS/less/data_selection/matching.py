import argparse
import os

import torch

# argparser = argparse.ArgumentParser(
#     description='Script for selecting the data for training')
# argparser.add_argument('--gradient_path', type=str, default="{} ckpt{}",
#                        help='The path to the gradient file')
# argparser.add_argument('--train_file_names', type=str, nargs='+',
#                        help='The name of the training file')
# argparser.add_argument('--ckpts', type=int, nargs='+',
#                        help="Checkpoint numbers.")
# argparser.add_argument('--checkpoint_weights', type=float, nargs='+',
#                        help="checkpoint weights")
# argparser.add_argument('--target_task_names', type=str,
#                        nargs='+', help="The name of the target tasks")
# argparser.add_argument('--validation_gradient_path', type=str,
#                        default="{} ckpt{}", help='The path to the validation gradient file')
# argparser.add_argument('--output_path', type=str, default="selected_data",
#                        help='The path to the output')
#
#
# args = argparser.parse_args()


# 如果添加了新的数据集，需要在这里设置
N_SUBTASKS = {"mmlu": 57, "bbh": 27, "tydiqa": 9}

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def calculate_influence_score(training_info: torch.Tensor, validation_info: torch.Tensor):
    """Calculate the influence score.

    Args:
        training_info (torch.Tensor): training info (gradients/representations) stored in a tensor of shape N x N_DIM
        validation_info (torch.Tensor): validation info (gradients/representations) stored in a tensor of shape N_VALID x N_DIM
    """
    # N x N_VALID
    influence_scores = torch.matmul(
        training_info, validation_info.transpose(0, 1))
    return influence_scores

def match(args):
    N_SUBTASKS = {"mmlu": 57, "bbh": 27, "tydiqa": 9}

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    # renormalize the checkpoint weights
    if sum(args['checkpoint_weights']) != 1:
        s = sum(args['checkpoint_weights'])
        args['checkpoint_weights'] = [i/s for i in args['checkpoint_weights']]

    # calculate the influence score for each validation task
    for target_task_name in [args['task']]:
        # maybe we want to select the data for a task from multiple datasets
        for train_file_name in [args['training_data_name']]:
            influence_score = 0
            # computing the influence score needs all checkpoints during the warmup training
            for i, ckpt in enumerate(args['ckpts']):
                print(target_task_name)
                print(ckpt)
                # load validation gradient
                validation_gradient_path = args['gradient_path']+"{}-checkpoint-{}-sgd/dim"+str(args['dims'])
                print(validation_gradient_path)
                validation_path = validation_gradient_path.format(
                    target_task_name, ckpt)
                if os.path.isdir(validation_path):
                    validation_path = os.path.join(validation_path, "grads_all_ranks.pt")
                validation_info = torch.load(validation_path)

                if not torch.is_tensor(validation_info):
                    validation_info = torch.tensor(validation_info)
                validation_info = validation_info.to(device).float()

                # load training gradient
                train_gradient_path = args['gradient_path'] + "{}-checkpoint-{}-adam/dim" + str(args['dims'])
                gradient_path = train_gradient_path.format(train_file_name, ckpt)
                if os.path.isdir(gradient_path):
                    gradient_path = os.path.join(gradient_path, "grads_all_ranks.pt")
                training_info = torch.load(gradient_path)

                if not torch.is_tensor(training_info):
                    training_info = torch.tensor(training_info)
                training_info = training_info.to(device).float()

                influence_score += args['checkpoint_weights'][i] * \
                    calculate_influence_score(
                        training_info=training_info, validation_info=validation_info)

            # use mmlu as example，mmlu has 57 subtasks。we collect 5 samples for each subtask
            # so we have validation set for mmlu with 57*5=285 samples
            # we calculate the influence score for each (train, valid) pairs
            # so the shape of influence_score is n_train * n_valid (500 * 285)


            # here we take the mean value for each subtask (n_train, subtasks, valid_samples)   ---> n_valid = subtasks * valid_samples
            # we take the max value of all tasks as the final influence score
            influence_score = influence_score.reshape(
                influence_score.shape[0], N_SUBTASKS[target_task_name], -1).mean(-1).max(-1)[0]
            output_dir = os.path.join(args['output_path'], target_task_name)
            if not os.path.exists(output_dir):
                os.makedirs(output_dir)
            output_file = os.path.join(
                args['output_path'], target_task_name, f"{train_file_name}_influence_score.pt")
            torch.save(influence_score, output_file)
            print("Saved influence score to {}".format(output_file))

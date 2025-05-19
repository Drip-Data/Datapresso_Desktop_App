import json
import argparse


def get_avg_lr(log_path):

    with open(log_path, "r") as f:
        data = json.load(f)
    
    log_history = data["log_history"]
    lr = 0
    for item in log_history:
        lr += item['learning_rate']
    
    return lr / len(log_history)


import argparse
import os

import torch


def count_lines(filename):
    with open(filename, 'r', encoding='utf-8', errors='ignore') as file:
        line_count = 0
        for line in file:
            line_count += 1
    return line_count


def write_selected_data(args):
    # args = parse_args()
    assert len([args['training_data_name']]) == len([args['training_data_file']])
    assert args['percentage'] is not None or args['max_samples'] is not None
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    n_train_files = len([args['training_data_name']])

    for target_task in [args['task']]:
        output_path = os.path.join(args['output_path'], target_task) 
        # ../selected_data/tydiqa

        score_paths = [os.path.join(
            output_path, f"{train_file_name}_influence_score.pt") for train_file_name in [args['training_data_name']]]
        
        # ../selected_data/tydiqa/dolly_influence_score.pt
        num_samples = []
        for score_path in score_paths:
            num_samples.append(
                len(torch.load(score_path, map_location=device)))
        cumsum_num_samples = torch.cumsum(torch.tensor(num_samples), dim=0)

        total_samples = sum(num_samples)
        if args['percentage'] is not None:
            args['max_samples'] = int(args['percentage'] * total_samples)
            data_amount_name = f"p{args['percentage']}"
        else:
            data_amount_name = f"num{args['max_samples']}"

        all_scores = []
        for score_path, train_file in zip(score_paths, [args['training_data_file']]):
            score = torch.load(score_path, map_location=device)
            all_scores.append(score)
        all_scores = torch.cat(all_scores, dim=0)

        # sort the scores and output the corresponding data index
        file_specific_index = torch.cat(
            [torch.arange(line_num) for line_num in num_samples]).to(device)
        data_from = torch.cat([torch.ones(line_num, dtype=torch.long)
                              * i for i, line_num in enumerate(num_samples)]).to(device)
        sorted_scores, sorted_index = torch.sort(
            all_scores, dim=0, descending=True)
        sorted_score_file = os.path.join(output_path, f"sorted.csv")

        data_from = data_from[sorted_index]
        sorted_index = file_specific_index[sorted_index]
        

        if not os.path.exists(sorted_score_file):
            with open(sorted_score_file, 'w', encoding='utf-8') as file:
                file.write("file name, index, score\n")
                for score, index, name in zip(sorted_scores, sorted_index, data_from):
                    file.write(
                        f"{args['training_data_name'][name.item()]}, {index.item()}, {round(score.item(), 6)}\n")

        topk_scores, topk_indices = torch.topk(
            all_scores.float(), args['max_samples'], dim=0, largest=True)

        all_lines = []
        for i, train_file in enumerate([args['training_data_file']]):
            with open(train_file, 'r', encoding='utf-8', errors='ignore') as file:
                all_lines.append(file.readlines()[:num_samples[i]])

        final_index_list = sorted_index[:args['max_samples']].tolist()
        final_data_from = data_from[:args['max_samples']].tolist()
        import json
        # save as json to be consistent with the llama-factory format
        json_list = []
        for index, data_from in zip(final_index_list, final_data_from):
            try:
                json_obj = json.loads(all_lines[data_from][index])
                json_list.append(json_obj)
            except:
                import pdb
                pdb.set_trace()


        with open(os.path.join(output_path, f"top_{data_amount_name}.json"), 'w', encoding='utf-8') as file:
            json.dump(json_list, file, ensure_ascii=False, indent=2)
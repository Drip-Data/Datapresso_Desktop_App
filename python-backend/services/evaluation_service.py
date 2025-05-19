import os
import json
from typing import List, Dict, Any
from services.data_filtering_service import DataFilteringService
from utils.helpers import get_project_root, ensure_directory_exists

class EvaluationService:
    def __init__(self, project_name: str, eval_name: str):
        self.project_name = project_name
        self.eval_name = eval_name
        self.project_root = get_project_root()
        self.eval_dir = os.path.join(self.project_root, "projects", self.project_name, "evaluations", self.eval_name)
        ensure_directory_exists(self.eval_dir)
        self.data_filtering_service = DataFilteringService(project_name)

    def load_evaluation_data(self) -> List[Dict[str, Any]]:
        """
        Loads evaluation data from the specified JSON file.
        """
        eval_file_path = os.path.join(self.eval_dir, "evaluation_data.json")
        if not os.path.exists(eval_file_path):
            return []
        with open(eval_file_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def save_evaluation_data(self, data: List[Dict[str, Any]]) -> None:
        """
        Saves evaluation data to the specified JSON file.
        """
        eval_file_path = os.path.join(self.eval_dir, "evaluation_data.json")
        with open(eval_file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)

    def run_evaluation(self, filtered_data_ids: List[str]) -> Dict[str, Any]:
        """
        Runs the evaluation process on the filtered data.
        This is a placeholder for the actual evaluation logic.
        """
        # In a real scenario, this method would involve:
        # 1. Loading the actual data points corresponding to filtered_data_ids
        # 2. Running them through the model(s) to be evaluated
        # 3. Collecting responses
        # 4. Applying evaluation metrics (e.g., accuracy, F1-score, custom metrics)
        # 5. Storing and returning the results

        evaluation_results = {
            "total_evaluated": len(filtered_data_ids),
            "passed_eval": 0, # Placeholder
            "failed_eval": 0, # Placeholder
            "metrics": {} # Placeholder for detailed metrics
        }

        # Simulate some evaluation
        # For demonstration, let's assume some items pass and some fail
        # and we calculate a dummy accuracy.
        if filtered_data_ids:
            passed_count = len(filtered_data_ids) // 2 # Example: half pass
            failed_count = len(filtered_data_ids) - passed_count
            accuracy = (passed_count / len(filtered_data_ids)) * 100 if len(filtered_data_ids) > 0 else 0

            evaluation_results["passed_eval"] = passed_count
            evaluation_results["failed_eval"] = failed_count
            evaluation_results["metrics"]["accuracy"] = f"{accuracy:.2f}%"
            evaluation_results["evaluated_ids"] = filtered_data_ids # Storing which IDs were part of this eval run

        self.save_evaluation_results(evaluation_results)
        return evaluation_results

    def save_evaluation_results(self, results: Dict[str, Any]) -> None:
        """
        Saves the evaluation results to a JSON file.
        """
        results_file_path = os.path.join(self.eval_dir, "evaluation_results.json")
        with open(results_file_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=4, ensure_ascii=False)
        print(f"Evaluation results saved to {results_file_path}")

    def get_evaluation_summary(self) -> Dict[str, Any]:
        """
        Retrieves the summary of the latest evaluation run.
        """
        results_file_path = os.path.join(self.eval_dir, "evaluation_results.json")
        if os.path.exists(results_file_path):
            with open(results_file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {"message": "No evaluation results found."}

    def get_all_evaluation_runs(self) -> List[str]:
        """
        (Placeholder) In a more advanced system, this would list all historical evaluation runs.
        For now, it implies that each 'eval_name' corresponds to one run or set of configurations.
        """
        # This could be expanded to look for multiple result files or a manifest.
        if os.path.exists(os.path.join(self.eval_dir, "evaluation_results.json")):
            return [self.eval_name]
        return []

if __name__ == '__main__':
    # Example Usage (assuming project 'sample_project' and eval 'first_eval' exist)
    # Ensure 'projects/sample_project/evaluations/first_eval' directory can be created
    # and 'projects/sample_project/filtered_data/default_filter_results.json' exists for filtering.

    print(f"Attempting to initialize EvaluationService for project 'sample_project', eval 'first_eval'")
    try:
        eval_service = EvaluationService(project_name="sample_project", eval_name="first_eval")
        print(f"EvaluationService initialized. Evaluation directory: {eval_service.eval_dir}")

        # Simulate getting filtered data IDs (normally from DataFilteringService)
        # For this example, let's assume DataFilteringService.get_filtered_data_ids()
        # would return IDs from 'projects/sample_project/filtered_data/default_filter_results.json'
        # Here, we'll mock it.
        # First, ensure a dummy filter result file exists for DataFilteringService to load
        mock_filter_dir = os.path.join(get_project_root(), "projects", "sample_project", "filtered_data")
        ensure_directory_exists(mock_filter_dir)
        mock_filter_file = os.path.join(mock_filter_dir, "default_filter_results.json")
        if not os.path.exists(mock_filter_file):
            with open(mock_filter_file, 'w', encoding='utf-8') as f:
                json.dump([
                    {"id": "data_point_1", "text": "Some text 1", "metadata": {"source": "A"}},
                    {"id": "data_point_2", "text": "Some text 2", "metadata": {"source": "B"}},
                    {"id": "data_point_3", "text": "Other text 3", "metadata": {"source": "A"}},
                ], f, indent=4)
            print(f"Created mock filter results file: {mock_filter_file}")


        # Use DataFilteringService to get IDs
        # This part simulates what an API endpoint might do before calling run_evaluation
        print("Loading filtered data IDs using DataFilteringService...")
        filtered_ids = eval_service.data_filtering_service.get_filtered_data_ids(filter_name="default_filter")
        if not filtered_ids:
            print("No filtered data IDs found. Cannot run evaluation.")
        else:
            print(f"Filtered data IDs loaded: {filtered_ids}")
            # Run evaluation
            print("Running evaluation...")
            results = eval_service.run_evaluation(filtered_data_ids=filtered_ids)
            print(f"Evaluation results: {results}")

            # Get evaluation summary
            print("Getting evaluation summary...")
            summary = eval_service.get_evaluation_summary()
            print(f"Evaluation summary: {summary}")

        # Example of saving and loading evaluation data (distinct from results)
        sample_eval_data = [
            {"id": "eval_item_1", "prompt": "Translate to French: Hello", "expected_response": "Bonjour"},
            {"id": "eval_item_2", "prompt": "What is 2+2?", "expected_response": "4"}
        ]
        print(f"\nSaving sample evaluation data: {sample_eval_data}")
        eval_service.save_evaluation_data(sample_eval_data)
        loaded_eval_data = eval_service.load_evaluation_data()
        print(f"Loaded evaluation data: {loaded_eval_data}")
        assert loaded_eval_data == sample_eval_data

        print("\nEvaluationService example usage finished.")

    except Exception as e:
        print(f"An error occurred during EvaluationService example: {e}")
        import traceback
        traceback.print_exc()

import json
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

def load_latency_data_from_json(file_path):
    with open(file_path, 'r') as file:
        data = json.load(file)
    return data['durationsTotal']

# List of JSON file paths
json_file_paths = [
    'deviation_data/0.json',
    'deviation_data/1.json',
    'deviation_data/2.json',
    'deviation_data/3.json',
    'deviation_data/4.json',
    'deviation_data/5.json',
    'deviation_data/6.json',
    'deviation_data/7.json',
    'deviation_data/8.json',
    'deviation_data/9.json',
]

# Load datasets
datasets = [load_latency_data_from_json(file_path) for file_path in json_file_paths]
datasets = np.array(datasets)

# Calculate mean latencies per dataset
mean_latencies_per_dataset = np.mean(datasets, axis=2)

# Calculate the standard deviation of the means across all datasets
std_dev_of_means = np.std(mean_latencies_per_dataset, axis=0).mean()

# Plot boxplot of mean latencies
plt.figure(figsize=(14, 5))
plt.rcParams.update({'font.size': 12})
sns.boxplot(data=mean_latencies_per_dataset.T)
plt.title('Abweichung der Datenerhebungen von Batch-Daten ohne Parameter, erhoben mit 2PC erfolgreich')
plt.xlabel('Index des Datensets')
plt.ylabel('Durchschnittliche Latenz der Batches (ms)')
plt.xticks(ticks=range(10), labels=[f'Set {i + 1}' for i in range(10)], rotation=45, ha='center')
plt.grid(True, linestyle='--', alpha=0.7)

# Add standard deviation of means to the legend
plt.legend([f'Standardabweichung des Mittelwerts: {std_dev_of_means:.2f} ms'])

plt.tight_layout()
plt.show()

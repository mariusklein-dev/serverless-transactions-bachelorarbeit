import json
from matplotlib import pyplot as plt
import numpy as np

# Load the first set of JSON files
file_paths_0 = [f"data/0_{i}.json" for i in range(10)]
success_counts_0 = []
fail_counts_0 = []
average_latencies_0 = []

for file_path in file_paths_0:
    with open(file_path, 'r') as file:
        data = json.load(file)
        success_counts_0.append(data['successCountTotal'])
        fail_counts_0.append(data['failCountTotal'])
        average_latencies_0.append(np.mean(data['averageDurations']))

# Load the second set of JSON files
file_paths_1 = [f"data/1_{i}.json" for i in range(10)]
success_counts_1 = []
fail_counts_1 = []
average_latencies_1 = []

for file_path in file_paths_1:
    with open(file_path, 'r') as file:
        data = json.load(file)
        success_counts_1.append(data['successCountTotal'])
        fail_counts_1.append(data['failCountTotal'])
        average_latencies_1.append(np.mean(data['averageDurations']))

# Calculate the overall average latencies
overall_average_latency_0 = np.mean(average_latencies_0)
overall_average_latency_1 = np.mean(average_latencies_1)

# Determine the limits for the y-axis
min_count_0 = min(success_counts_0)
max_count_0 = max(success_counts_0)
min_count_1 = min(success_counts_1)
max_count_1 = max(success_counts_1)

y_min = min(min_count_0, min_count_1) - 25
y_max = max(max_count_0, max_count_1) + 25

# Create the subplots
fig, (ax0, ax1) = plt.subplots(1, 2, figsize=(12, 4))
plt.rcParams.update({'font.size': 12})

x = np.arange(1, len(success_counts_0) + 1)  # x-axis starting from 1

# Define colors
success_color = 'darkgreen'
fail_color = 'darkred'
outline_color = 'black'

# Plot for the first set of data
ax0.bar(x, success_counts_0, color=success_color, edgecolor=outline_color, label=f'Anzahl erfolgreich: {np.sum(success_counts_0)}')
ax0.bar(x, [-fail for fail in fail_counts_0], color=fail_color, edgecolor=outline_color, label=f'Anzahl fehlgeschlagen: {np.sum(fail_counts_0)}')
ax0.set_ylim(y_min, y_max)
ax0.legend(title=f'Durchschnittliche Latenz: {overall_average_latency_0:.2f} ms')
ax0.set_xlabel('Index des Tests')
ax0.set_ylabel('Anzahl der Transaktionen in 60 Sekunden')
ax0.set_title('Durchsatz des Saga-Musters')
ax0.set_xticks(x)
ax0.set_xticklabels([str(i) for i in x])
ax0.tick_params(axis='y')

# Plot for the second set of data
ax1.bar(x, success_counts_1, color=success_color, edgecolor=outline_color, label=f'Anzahl erfolgreich: {np.sum(success_counts_1)}')
ax1.bar(x, [-fail for fail in fail_counts_1], color=fail_color, edgecolor=outline_color, label=f'Anzahl fehlgeschlagen: {np.sum(fail_counts_1)}')
ax1.set_ylim(y_min, y_max)
ax1.legend(title=f'Durchschnittliche Latenz: {overall_average_latency_1:.2f} ms')
ax1.set_xlabel('Index des Tests mit steigender Parallelität')
ax1.set_ylabel('')
ax1.set_title('Mit parallelem Zugriff auf Ressourcen')
ax1.set_xticks(x)
ax1.set_xticklabels([str(i) for i in x])
ax1.tick_params(axis='y')

# Improve layout
plt.tight_layout()

# Show the plot
plt.show()

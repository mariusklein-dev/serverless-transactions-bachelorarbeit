import json
from matplotlib import pyplot as plt
import numpy as np

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

# Calculate success/fail ratios
ratios = [success / fail if fail > 0 else float('inf') for success, fail in zip(success_counts_1, fail_counts_1)]

# Create the line plot
x = np.arange(1, len(success_counts_1) + 1)  # x-axis starting from 1

plt.figure(figsize=(10, 6))
plt.plot(x, ratios, marker='', color='blue', label='Verhältnis Erfolg zu Fehlschlag')

# Add labels and title
plt.xlabel('Index des Tests mit steigender Parallelität', fontsize=15)
plt.ylabel('Erfolgsquote (Erfolg/Fehlgeschlagen)', fontsize=15)
plt.title('Entwicklung der Erfolgsquote bei 2PC Durchsatztests', fontsize=18)
plt.xticks(x)  # Ensure x-axis ticks correspond to test indices
plt.legend()

# Annotate the ratio values on the plot
for i, ratio in enumerate(ratios):
    plt.text(x[i], ratios[i], f'{ratios[i]:.2f}', ha='left', va='bottom', fontsize=15)

# Improve layout
plt.tight_layout()

# Show the plot
plt.show()
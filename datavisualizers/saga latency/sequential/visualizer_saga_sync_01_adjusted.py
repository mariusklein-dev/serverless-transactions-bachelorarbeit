import matplotlib.pyplot as plt

latencies_succeed = [
        6360,
        378,
        425,
        357,
        386,
        370,
        345,
        377,
        354,
        345,
        320,
        347,
        330,
        330,
        320,
        320,
        307,
        284,
        297,
        298,
        395,
        282,
        281,
        286,
        280,
        261,
        281,
        264,
        256,
        260,
        265,
        274,
        281,
        261,
        275,
        270,
        260,
        289,
        256,
        253,
        263,
        266,
        265,
        245,
        267,
        262,
        274,
        276,
        264,
        263,
        257,
        264,
        256,
        262,
        261,
        255,
        247,
        262,
        274,
        307,
        253,
        259,
        255,
        256,
        282,
        363,
        283,
        260,
        266,
        258,
        275,
        263,
        262,
        265,
        256,
        256,
        276,
        281,
        247,
        252,
        245,
        255,
        249,
        246,
        246,
        254,
        268,
        267,
        260,
        250,
        247,
        265,
        263,
        259,
        258,
        276,
        248,
        284,
        251,
        254,
        251
    ]

latencies_fail = [
        8667,
        534,
        504,
        451,
        564,
        453,
        486,
        451,
        444,
        472,
        438,
        442,
        424,
        439,
        423,
        423,
        417,
        373,
        380,
        427,
        364,
        404,
        359,
        364,
        376,
        404,
        365,
        331,
        348,
        337,
        353,
        356,
        403,
        351,
        367,
        360,
        354,
        482,
        334,
        328,
        339,
        326,
        340,
        321,
        312,
        376,
        359,
        357,
        353,
        331,
        367,
        374,
        393,
        349,
        367,
        358,
        322,
        357,
        328,
        338,
        355,
        358,
        320,
        330,
        317,
        314,
        334,
        305,
        337,
        328,
        324,
        340,
        331,
        328,
        354,
        328,
        332,
        374,
        324,
        319,
        321,
        364,
        320,
        356,
        317,
        339,
        334,
        324,
        326,
        333,
        326,
        325,
        364,
        327,
        328,
        312,
        327,
        308,
        320,
        316,
        318
    ]

average_latency_succeed = sum(latencies_succeed) / len(latencies_succeed)

latencies_succeed_without_outlier = [latency for latency in latencies_succeed if latency != max(latencies_succeed)]
average_latency_succeed_without_outlier = sum(latencies_succeed_without_outlier) / len(latencies_succeed_without_outlier)

average_latency_fail = sum(latencies_fail) / len(latencies_fail)
latencies_fail_without_outlier = [latency for latency in latencies_fail if latency != max(latencies_fail)]
average_latency_fail_without_outlier = sum(latencies_fail_without_outlier) / len(latencies_fail_without_outlier)


plt.figure(figsize=(14, 7))
plt.rcParams.update({'font.size': 16})
plt.rcParams["legend.loc"] = ('upper right')


plt.plot(latencies_succeed_without_outlier, marker='.', linestyle='-', color='b', label='Latenzen Erfolgreich (ms)')
plt.plot(latencies_fail_without_outlier, marker='.', linestyle='-', color='g', label='Latenzen Abbruch (ms)')
plt.axhline(y=average_latency_succeed_without_outlier, color='r', linestyle='--', label=f'Durchschnittliche Latenz Erfolg ({average_latency_succeed_without_outlier:.2f} ms)')
plt.axhline(y=average_latency_fail_without_outlier, color='orange', linestyle='--', label=f'Durchschnittliche Latenz Abbruch ({average_latency_fail_without_outlier:.2f} ms)')
plt.title('Sequentielles Saga Latenztestszenario mit Ausreißereliminierung')
plt.xlabel('Index der Transaktion')
plt.ylabel('Latenz in Millisekunden (ms)')
plt.grid(True)
plt.legend()

plt.tight_layout()
plt.show()

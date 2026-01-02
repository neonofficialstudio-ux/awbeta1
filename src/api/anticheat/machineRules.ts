
// Machine Rules Engine V1.0
// Regras absolutas para definir fraudes com precisão

export const MachineRules = {
  evaluate(user: any, activity: any) {
    const flags: string[] = [];

    if (activity.deltaCoins > 5000)
      flags.push("Ganho absurdo de moedas (Rule #A1)");

    if (activity.actionsPerSecond > 3)
      flags.push("Ações impossíveis em tempo real (Rule #B4)");

    if (activity.missionRepeats > 1)
      flags.push("Missão enviada múltiplas vezes (Rule #C2)");

    if (activity.jackpotBuySpam > 7)
      flags.push("Spam de compra no jackpot (Rule #J1)");

    if (activity.storeSpam > 10)
      flags.push("Tentativa de abuso na loja (Rule #S7)");

    if (activity.deviceMismatch > 3)
      flags.push("Troca suspeita de dispositivo (Rule #D5)");

    return flags;
  }
};

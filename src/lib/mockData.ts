function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

export function generateSparkline(seed: number, days = 7, baseline = 100, volatility = 20) {
  const rand = seededRandom(seed)
  return Array.from({ length: days }, (_, i) => ({
    day: `D${i + 1}`,
    value: Math.round(baseline + (rand() - 0.5) * volatility * 2 + i * (rand() * 4)),
  }))
}

export function generateRevenueSeries(days = 90) {
  const rand = seededRandom(42)
  const today = new Date()
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (days - 1 - i))
    const trend = i / days
    const noise = (rand() - 0.5) * 600
    const weekdayBoost = [0, 6].includes(date.getDay()) ? -200 : 100
    return {
      date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      Receita: Math.max(800, Math.round(1200 + trend * 1800 + noise + weekdayBoost)),
      Conversões: Math.max(15, Math.round(40 + trend * 60 + (rand() - 0.5) * 25 + weekdayBoost / 20)),
    }
  })
}

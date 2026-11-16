# home_workout_react_native

A simple workout tracker for your phone. Log your sets each day, look back at a calendar of what you really did, and watch your numbers grow on a chart. Everything stays on your phone: no account and no server.

**Still being built.** I made this for my own training, so it fits how I work out rather than trying to be a big product.

## Features

1. **Your own exercises and units:** reps, kg, seconds, distance or anything else you set for each exercise.
2. **Daily log:** one entry per day, with as many sets per exercise as you like.
3. **Calendar:** see every day you trained at a glance.
4. **Stats:** a line chart for each exercise.
5. **Backup and restore:** save your exercises, or all your data, to a file and load it back later.
6. **Light and dark theme.**
7. **Offline and private:** your data is saved on the phone only.

## Screens

```
app/(tabs)/workouts.tsx   add and manage exercises
app/(tabs)/calendar.tsx   the days you trained
app/(tabs)/stats.tsx      a chart for each exercise
app/(tabs)/settings.tsx   theme, backup and restore
app/log/[date].tsx        log or edit one day
```

## Run it

```bash
git clone https://github.com/p32929/home_workout_react_native.git
cd home_workout_react_native
npm install
npm run dev        # then scan the QR code with Expo Go
```

To open it straight on one platform, use `npm run android`, `npm run ios` or `npm run web`.

It is made with React Native, Expo and Uniwind, starting from the [React Native Reusables](https://reactnativereusables.com) "Minimal (Uniwind)" template.

## Contributing

Contributions are very welcome, thank you! Before you start on a pull request, please open an issue and tell me what you would like to add or change. That way we can agree on it first, and your time is not spent on something that might not fit.

## Share

<a href="https://p32929.github.io/share/?repo=home_workout_react_native"><img src="https://p32929.github.io/readme/share.svg" alt="Share this with your friends in just a click" width="420"></a>

## Support

<a href="https://p32929.github.io/support/"><img src="https://p32929.github.io/readme/support.svg" alt="If you like my works and want to support me, feel free to support" width="420"></a>

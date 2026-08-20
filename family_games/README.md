# Family Games

Score sheets for Contract Rummy and Mormon Bridge, plus a stats page over the
games that have been submitted. React + Vite on GitHub Pages; the API is a Lambda
(`src/api/lambda.js`) in front of a DynamoDB table.

One game is one item in that table, keyed on `id` and `player_round`. Both key
attributes are misnomers kept for their names' sake — a table's key schema can't
be changed after it's created — so `id` holds `FAMILY#date_number` and
`player_round` holds the game's type. See the comment at the top of
`src/api/lambda.js`.

## Development

```
npm run dev
```

## Deploying

The site is served from the committed `dist/`, so pushing source alone changes
nothing on the live page:

```
npm run build
git add -A family_games/dist   # -A so the previous hashed asset is dropped
```

`src/api/lambda.js` is deployed separately and by hand to the Lambda behind
`API_BASE_URL` in `src/api/routes.js`.

## Importing games from a spreadsheet

1. Put the games in the sheet, one row per player per round.
2. Export as CSV and replace `test_game.csv`.
3. `node import-csv.js`

Columns used: `id`, `date`, `type`, `family`, `player`, `round`, `score`. Include
`date_round` and `player_round` if the sheet has them; they're used only to order
the rows, which matters for the reason below.

- **Dates must be `YYYY-MM-DD`.** Anything else is stored verbatim and then sorts
  and filters wrongly for good, because dates are compared as strings.
- **`id` is the game's number within its day.** Either `4` or `2026-08-17_4`
  works — the importer takes whatever follows the last `_`.
- **Casing doesn't matter.** Family, player, round and type are uppercased on the
  way in, so `cami` and `CAMI` are the same player and would merge.
- **An import overwrites** any game already filed under the same family, date,
  number and type. Check that number is free for that family and day first.
- **Mormon Bridge: row order is the seating.** There's no seat column, so players
  are seated in the order the importer first meets them — sorted by `date_round`
  then `player_round` where those columns exist, otherwise in CSV order.
- **Mormon Bridge rounds are `10` down to `1`, and a game that opened lower marks
  its repeats.** Ten cards each is more than the deck holds once six are playing,
  so a big table opens on nine or eight and plays that round again to keep the
  game ten rounds long: `9+, 9, 8, …, 1` or `8+, 8-, 8, 7, …, 1`. Write the mark
  in the `round` column — it's part of the round's name, and it's how the stats
  page knows to put the repeats at the front of the game rather than after it.
  The mark is a label only: `9+` is a nine-trick round exactly as `9` is.
- It writes straight to DynamoDB and bypasses the Lambda, so none of the API's
  row validation applies to it.

Credentials come from `~/.aws/credentials`: the `default` profile, or whatever
`AWS_PROFILE` names.

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

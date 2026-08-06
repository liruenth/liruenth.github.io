TODO
- implement reset mechanic (as well as a guard against it)
- implement saving data to AWS
- implement mormon bridge (with auto progress behavior)
- implement pull wins from AWS
- implementing groups would require the following algorithm
   - divide rows by groups and grab the remainder
   - use the floor + 1 for each remainder rows
   - use the floor for every row after




- Auto Step action will display a modal containing: A number input from 0 - round, a next button and a stop button.
- On clicking next the modal should save the number input to the scoreData in either the bid or the took, clear the input, then update the info for the next player.
- The modal will start from the first bid or took cell that needs a value and cycle through each player from there to enter either bid or took
- For the bid cycle, the modal will display the text "Round {round} - {player}'s bid", Then the text "{(Round as a number) minus (sum of Bids)} for {number of players without bids} left". It is fine for it to display negative numbers.
- For the took cycle, the modal will display the text "Round {round} - {player} took".
- Once all the players have their "bid" entered it will cycle back through for their "took". Once all "tooks" are entered the modal will skip 1 person and cycle through again for the next round and repeat the process until all rounds are over or the user clicks stop
- The Remove Player Action will disable the selected player's row preventing any inputs and they should no longer be part of the auto step process as well.


run test server with `npm run dev`

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

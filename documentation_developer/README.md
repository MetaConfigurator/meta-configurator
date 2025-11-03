# Development

The project relies on [Node Js](https://nodejs.org/en/download/).

We use [vue.js](https://vuejs.org/) as a frontend framework and [PrimeVue](https://www.primefaces.org/primevue/) for the UI components.

## Installation

To launch the application, follow these steps:

1. Clone the repository to your local machine:
   ```shell
   git clone https://github.com/MetaConfigurator/meta-configurator.git
   ```
2. Navigate into web application folder:
   ```sh
   cd meta_configurator
3. Install the necessary dependencies:
   ```sh
   npm install
   ```
4. Launch the application:
   ```sh
   npm run dev
   ```

## Formatting and Linting

When you push your changes to the repository, one of the Github workflows automatically performs a linting check, as well as an automated formatting.
To run the linting or formatting by yourself, type:

```sh
npm run lint
npm run prettier
```

To avoid/fix merge conflicts due to the automated formatting, you can do either:

1. Call `npm run prettier` locally before you push.
2. Or before you push a second time, first pull the new formatting changes.
3. Or `rebase` and simply overwrite all formatting changes of the remote with your current code. The formatting will anyways be executed again. 

## Tests

For detailed testing descriptions, see [the testing documentation](TESTING.md)

In short, run unit tests and end-to-end tests the following way:


```sh
npm run test
npm run test:e2e
```

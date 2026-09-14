# AI Assistance

## Overview

MetaConfigurator provides different AI-assisted features to help you create and edit JSON schemas and instance data using natural language inputs.

Demonstration and Introduction video from the Allotrope Connect Workshop 2025 (click the image to open the video on Youtube):

[![AI Assistance Introduction Video](http://i3.ytimg.com/vi/DfS6PgMr1q0/hqdefault.jpg)](https://www.youtube.com/watch?v=DfS6PgMr1q0)


## Requirements

By default, MetaConfigurator uses the public **Uni Stuttgart Relay**, which forwards to
**Helmholtz Blablador**. In that default setup, no browser API key is required.
Availability is best-effort and cannot be guaranteed.

If you switch to a direct provider connection, you need an API key from that LLM provider
(for example from [OpenAI](https://platform.openai.com/signup/)).

## Endpoint Configuration

To configure the LLM endpoint, open an AI-assisted feature (e.g., `Show AI Prompts View` button in the top menu bar) and expand the expandable/collapsible dialog.
Here, you can enter your API key and select the desired LLM endpoint (e.g., OpenAI GPT-4, Perplexity, or a custom endpoint) and other parameters.

The AI Endpoint Settings support three connection modes:

- **Uni Stuttgart Relay / HTTPS Relay**: use the default public relay or any other HTTPS MetaConfigurator relay.
- **Direct Endpoint**: connect straight from the browser to an LLM endpoint. This only works if that endpoint allows CORS requests.
- **HTTP Relay**: local HTTP-only variant for development.

If you want to self-host a relay, see [`backend/relay/README.md`](../../../backend/relay/README.md).

<img alt="AI Endpoint Configuration" src="figs/ai_settings.png" width="400"/>

## How to Use AI Assistance

### Schema Creation and Editing

Open the AI Prompts View by clicking the `Show AI Prompts View` button in the top menu bar.
Now you can enter prompts to create or edit schemas using natural language.

### Data Import

In the `Data` tab, click `Open / Import Data...` -> `Advanced Data Import...`.
Depending on the input format, AI can generate a JavaScript conversion function, map the parsed data onto the current schema, or convert the whole document directly.
See [Data Import](../data_import) for the import modes and when to use which.

### Data to Schema Mapping

In the `Data` tab, click `Utility...` -> `Transform Data to match the Schema...`.
This generates a reusable mapping function (JSONata or JavaScript) that converts the current data to the target schema, or applies the transformation directly.
See [Data to Schema Mapping](../data_to_schema_mapping) for the available methods and options.

### Data Transformation to other Formats

In the `Data` tab, click `Utility...` -> `Export Data via Text Template...`.
This will open a dialog to generate a text template using AI to transform the current data to another format (e.g., XML, CSV, custom format).
The generated text template can be reviewed and adjusted before applying it to transform the data.

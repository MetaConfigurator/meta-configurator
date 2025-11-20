MetaConfigurator as a Configurator Builder
==========================================

MetaConfigurator can be used as a **Configurator Builder**, allowing users to create and share URLs that open MetaConfigurator with preloaded schema, data, and settings. This enables a customized experience tailored to a specific use case.

Note that this section describes creating such a shareable URL by hand. Instead, you can also simply click the 'Share Snapshot" button in the top menu bar in the data/schema editor to create a snapshot of 'data', 'schema' and 'settings' which will be stored on the University of Stuttgart server. 
Additionally, a unique shareable URL will be created that leads to MetaConfigurator with the snapshot preloaded.
Creating your own URL instead comes with the benefit of storing the files in any location of your choice and it does not rely on the university server to be up and running.
Otherwise, clicking the button 'Share Snapshot' to auto-generate the URL is easier and more convenient.

Constructing a Preloaded URL
----------------------------

You can construct a MetaConfigurator URL that preloads a schema, data file, and settings file by appending query parameters:

*   **Schema**: ?schema=schemaUrl

*   **Data**: ?data=dataUrl

*   **Settings**: ?settings=settingsUrl

*   **Combination**: ?schema=schemaUrl&data=dataUrl&settings=settingsUrl


Each of these parameters is optional, allowing flexibility in what gets preloaded.

### Example


```https://metaconfigurator.github.io/meta-configurator/?schema=https://github.com/MetaConfigurator/meta-configurator/blob/main/documentation_user/examples/configurator_building/synthesis.schema.json&settings=https://github.com/MetaConfigurator/meta-configurator/blob/main/documentation_user/examples/configurator_building/configurator_settings.json```
This URL will open MetaConfigurator with the provided schema, data, and settings preloaded.
Try here: [Open MetaConfigurator with Preloaded Schema and Settings](https://metaconfigurator.github.io/meta-configurator/?schema=https://github.com/MetaConfigurator/meta-configurator/blob/main/documentation_user/examples/configurator_building/synthesis.schema.json&settings=https://github.com/MetaConfigurator/meta-configurator/blob/main/documentation_user/examples/configurator_building/configurator_settings.json)

Customizing the User Interface
------------------------------

The settings file allows fine-grained control over the MetaConfigurator interface, including:

*   **Custom Title**: Define a custom title displayed in the menu bar.

*   **Font and UI Styles**: Adjust font size and other layout settings.

*   **Visible Panels**: Choose which panels are shown (e.g., GUI view, text view, schema diagram).

*   **Mode Restrictions**: Hide schema editor mode or settings editor mode to simplify the UI for end users.

*   **[Schema Selection List](https://github.com/MetaConfigurator/meta-configurator/blob/main/documentation_user/examples/schema_selection_list)**: Customize the list of schemas to choose from in the schema selection dialog.

### Preserving the Interface State

To ensure a consistent user experience, simply configure the interface by opening the panels you want, then copy the settings.
The settings file will store the currently visible panels and UI configurations, ensuring the same view when shared.

Sharing and Shortening URLs
---------------------------

The generated URLs can be shared with others for easy access. 
For convenience, long URLs can be shortened using URL shorteners before sharing, using external tools.

Real-World Example: preCICE Adapter Configuration
-------------------------------------------------

A practical example of this feature is in the [preCICE](https://www.precice.org/) multi-physics coupling library.
MetaConfigurator is used to provide a UI for configuring standardized solver adapters.
The full implementation can be found in their repository:

[preCICE Adapter Configuration Schema](https://github.com/precice/preeco-orga/tree/main/adapter-config-schema)

By leveraging MetaConfigurator in this way, users can create specialized configurators tailored to their specific needs without exposing unnecessary complexity.

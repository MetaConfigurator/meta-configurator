> [!NOTE]  
> You are using MetaConfigurator? Please [get in touch with us](https://forms.gle/MHKvrkMfdymH8TDs5)! We are currently applying for funding to turn the tool into a research infrastructure and want to prepare an overview of the existing user base. Besides, we are interested in your ideas, your feedback, and any feature requests.


MetaConfigurator
================

![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/MetaConfigurator/meta-configurator/e2e.yml?label=End%20to%20End%20Tests)
![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/MetaConfigurator/meta-configurator/npm-test.yml?label=Unit%20Tests)
![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/MetaConfigurator/meta-configurator/github-pages.yml?label=Github%20Pages%20Build)
![GitHub License](https://img.shields.io/github/license/MetaConfigurator/meta-configurator)


🚀 What is MetaConfigurator?
----------------------------

MetaConfigurator is a powerful, user-friendly schema editor and form generator for JSON Schema. It simplifies the process of creating and editing structured data files such as configuration files and research data, making it accessible to both technical and non-technical users.

🔗 **Try it out now:**

*   **Stable Release:** [www.metaconfigurator.org](https://www.metaconfigurator.org/)

*   **Experimental Version:** [metaconfigurator.github.io/meta-configurator](https://metaconfigurator.github.io/meta-configurator/)


### 🎯 What Can MetaConfigurator Do?

MetaConfigurator is a versatile tool that can be used for:

*   **Schema & Data Model Creation or Editing** – Design and modify JSON Schema structures using an intuitive graphical editor.

*   **Assisted Data Editing** – Edit JSON and YAML files efficiently with structured guidance based on schemas.

*   **Configurator Builder** – Generate custom configurators that can be shared with others via pre-configured links.


🌟 Why Use MetaConfigurator?
----------------------------

Creating structured data files (or schemas) manually can be complex and error-prone. MetaConfigurator removes this friction by providing an intuitive UI for editing JSON and YAML files based on a schema. It’s perfect for both beginners and experts who need a powerful yet easy-to-use tool.

### ✅ Features & Benefits

*   **Visual Schema Editor** – Create and edit JSON schemas using a graphical UI.

*   **Flexible Data Editing** – Edit data using both a GUI and text editor, ensuring maximum flexibility.

*   **Schema Inference & CSV Import** – Automatically generate schemas from CSV files.

*   **Snapshot Sharing** – Share pre-configured links with preloaded schema, data, and settings.

*   **Ontology Integration** – Auto-complete URIs for structured data.

*   **Schema Diagram View** – Visually explore and modify complex schemas.

*   **Custom UI Modes** – Adjust the interface to suit different user levels (beginner & advanced modes).

*   **Pre-configured Configurators** – Generate shareable links that open MetaConfigurator with preloaded settings, acting as a tailor-made configuration tool.

*   **Support for JSON Schema Draft-2020-12** – Ensuring compatibility with modern schema definitions.

*   **Code Generation** – Generate source code from JSON schemas in multiple programming languages (Python, Rust, TypeScript, C++, Java, etc.) using [quicktype](https://github.com/glideapps/quicktype/).

*   **Documentation Generation** – Generate documentation from JSON schemas, with export to a Markdown file.

🛠️ Development
---------------

MetaConfigurator is built with **Vue.js** and **PrimeVue** for an intuitive user experience.

### 🔧 Getting Started

1.  git clone https://github.com/MetaConfigurator/meta-configurator.git

2.  `cd meta-configurator`

3.  `npm install`

4.  `npm run dev`


For more details, check out the [Developer Documentation](./documentation_developer).

📖 User Guide & Examples
------------------------

Explore how to use MetaConfigurator with real-world examples:

*   **[MOF Synthesis Example](./documentation_user/examples/mof_synthesis)** – Demonstrates schema generation, CSV import, and JSON export.

*   **[Configurator Builder](./documentation_user/examples/configurator_building)** – Learn how to create and share pre-configured MetaConfigurator URLs.

*   **[Code Generation](./documentation_user/examples/code_generation)** – Learn how to generate code in multiple programming languages from JSON schemas.



📚 Read the full [User Documentation](./documentation_user).

📄 Citing MetaConfigurator
--------------------------

If MetaConfigurator is useful for your research, please cite it using the following BibTeX entry:

```bibtex
@article{metaconfigurator2024, 
year = {2024}, 
title = {{MetaConfigurator: A User-Friendly Tool for Editing Structured Data Files}}, 
author = {Neubauer, Felix and Bredl, Paul and Xu, Minye and Patel, Keyuriben and Pleiss, Jürgen and Uekermann, Benjamin}, 
journal = {Datenbank-Spektrum}, 
issn = {1618-2162}, 
doi = {10.1007/s13222-024-00472-7}, 
abstract = {{Textual formats to structure data, such as JSON, XML, and YAML, are widely used for structuring data in various domains, from configuration files to research data. However, manually editing data in these formats can be complex and time-consuming. Graphical user interfaces (GUIs) can significantly reduce manual efforts and assist the user in editing the files, but developing a file-format-specific GUI requires substantial development and maintenance efforts. To address this challenge, we introduce MetaConfigurator: an open-source web application that generates its GUI depending on a given schema. Our approach differs from other schema-to-UI approaches in three key ways: 1) It offers a unified view that combines the benefits of both GUIs and text editors, 2) it enables schema editing within the same tool, and 3) it supports advanced schema features, including conditions and constraints. In this paper, we discuss the design and implementation of MetaConfigurator, backed by insights from a small-scale qualitative user study. The results indicate the effectiveness of our approach in retrieving information from data and schemas and in editing them.}}, 
pages = {1--9}
}
```

❓ FAQ
------

### 🔒 What happens to the data I type into MetaConfigurator?

MetaConfigurator runs entirely **inside your browser** - it does **not** send your schemas, data, or anything you type to any server. The website itself is just a static page delivered by GitHub Pages (like downloading a PDF or image), and all the work happens locally on your computer.

The only exception is if you **click the “Share Snapshot” button**. Then, and only then, the snapshot you create is sent to a **University of Stuttgart** server so you can share a unique link with others.

📜 **See our [full Privacy Policy](PRIVACY.md)** for more information.

📝 License
----------

MetaConfigurator is open-source software licensed under the **[MIT License](LICENSE)**.
See the LICENSE file for more details.

🔗 **Join the Community & Contribute!** If you have feature requests, bug reports, or contributions, feel free to open an issue or submit a pull request on GitHub. 🚀

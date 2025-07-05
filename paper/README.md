# Our Research

This is a collection of research papers, articles and presentations that we have written, in chronological order.

# 2023

1. The [original thesis](./2023_10_paper_main_extended.pdf) that started the project. Also includes a small user study.



# 2024

2. The [first publication](./2024_05_paper_main_short.pdf) about MetaConfigurator, a shortened and adapted version of the original thesis.
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

3. The [master thesis](./2024_09_master_thesis_felix_neubauer.pdf) by Felix Neubauer, extending the tool by a schema diagram, CSV import, snapshot sharing, ontology integration, a toggle between a simple and an advanced mode and major architecture reworks. Also applied the tool in two real world domains: chemistry and simulation technology.
```bibtex
@mastersthesis{neubauer2024metaconfigurator,
  title={Data model creation with MetaConfigurator},
  author={Neubauer, Felix},
  year={2024},
  doi = {10.18419/opus-15126}, 
  abstract = {{In both research and industry, significant effort is devoted to the creation of standardized data models that ensure data adheres to a specific structure, enabling the development and use of common tools. These models (also called schemas), enable data validation and facilitate collaboration by making data interoperable across various systems. Tools can assist in the creation and maintenance of data models. One such tool is MetaConfigurator, a schema editor and form generator for JSON schema and for JSON/YAML documents. It offers a unified interface that combines a traditional text editor with a graphical user interface (GUI), supporting advanced schema features such as conditions and constraints. In this work, MetaConfigurator is viewed from the perspective of three exemplary real-world use case in fields such as biochemistry and ontology management. Multiple improvements and functionalities are designed and implemented to further assist the user: 1) A more user-friendly schema editor, distinguishing between an easy and an advanced mode based on a novel meta schema builder approach; 2) A CSV import feature for seamless data transition from Excel to the JSON format with schema inference; 3) Snapshot sharing for effortless collaboration; 4) Ontology integration for auto-completion of URIs; and 5) A novel graphical diagram-like schema view for visual schema manipulation. These new functionalities are then applied to the real-world use cases, demonstrating the practical utility and improved accessibility of MetaConfigurator.}}, 
}
```

# 2025

4. The [presentation](./2025_02_conference_talk_deRSE25.pdf) at the [deRSE25](https://events.hifis.net/event/2050/) conference, showcasing the tool and how to create data models with it.
```bibtex
@misc{neubauer2025metaconfiguratortalk,
  author={Neubauer, Felix and Uekermann, Benjamin and Pleiss, Jürgen},
  title={Data Model Creation with MetaConfigurator},
  month=feb,
  year=2025,
  publisher={Zenodo},
  doi={10.5281/zenodo.14981537},
  url={https://doi.org/10.5281/zenodo.14981537},
}
```

5. The  [paper](./2025_03_paper_data_model_creation.pdf) within the [*BTW2025 - Datenbanksysteme für Business, Technologie und Web*](https://btw2025.gi.de) proceedings. A shortened and adapted version of the master thesis.
```bibtex
@misc{metaconfigurator2025datamodels,
	author = "Neubauer, Felix and Pleiss, Jürgen and Uekermann, Benjamin",
	title = "Data Model Creation with MetaConfigurator",
	booktitle = "Datenbanksysteme für Business, Technologie und Web (BTW 2025)",
	year = 2025,
	publisher = "Gesellschaft für Informatik, Bonn",
	series = "Lecture Notes in Informatics (LNI) - Proceedings, Volume P-361",
	doi = "10.18420/BTW2025-60",
	url = "https://dl.gi.de/handle/20.500.12116/45927",
	abstract = "In both research and industry, significant effort is devoted to the creation of standardized data models that ensure data adheres to a specific structure, enabling the development and use of common tools. These models (also called schemas), enable data validation and facilitate collaboration by making data interoperable across various systems. Tools can assist in the creation and maintenance of data models.  One such tool is MetaConfigurator, a schema editor and form generator for JSON schema and for JSON/YAML documents. It offers a unified interface that combines a traditional text editor with a graphical user interface (GUI), supporting advanced schema features such as conditions and constraints. Still, schema editing can be complicated for novices, since MetaConfigurator shows all options of JSON schema, which is very expressive. The following improvements and functionalities have been designed and implemented to further assist the user: 1) A more user-friendly schema editor, distinguishing between an easy and an advanced mode based on a novel meta schema builder approach; 2) A CSV import feature for seamless data transition from Excel to JSON with schema inference; 3) Snapshot sharing for effortless collaboration; 4) Ontology integration for auto-completion of URIs; and 5) A novel graphical diagram-like schema view for visual schema manipulation. These new functionalities are then applied to a real-world use case in chemistry, demonstrating the usability and improved accessibility of MetaConfigurator."
}
```

import json

from rdkit import Chem
from rdkit.Chem import Draw
from jsonschema import validate

from documentation_user.examples.mof_synthesis.utils import collectMetadata

# Load JSON document with synthesis data
with open("ecmofsynthesis.json") as f:
    data = json.load(f)

with open("ecmofsynthesis.schema.json") as f:
    schema = json.load(f)

# Validate the JSON document
validate(data, schema)
print("Data validated successfully")


result_data = []
# Iterate over the JSON document and enrich it with metadata
for index, entry in enumerate(data[("ecmofsynthesis")]):

    metalSaltName = entry["metal_salt_name"]
    linkerName = entry["linker_name"]

    # Collect metadata for both molecules
    metalSaltMetadata = collectMetadata(metalSaltName)
    linkerMetadata = collectMetadata(linkerName)

    # draw both molecules and save to disk
    if "smiles" in metalSaltMetadata:
        mol1 = Chem.MolFromSmiles(metalSaltMetadata["smiles"])
        Draw.MolToFile(mol1, f"metal_salt_{metalSaltName}.png")
    if "smiles" in linkerMetadata:
        mol2 = Chem.MolFromSmiles(linkerMetadata["smiles"])
        Draw.MolToFile(mol2, f"linker_{linkerName}.png")

    # Append metadata to the entry
    result_entry = entry
    result_entry["metal_salt"] = metalSaltMetadata
    result_entry["linker"] = linkerMetadata
    result_data.append(result_entry)

# Save the result data
full_result = {"ecmofsynthesis": result_data}
with open("ecmofsynthesis_enriched.json", "w") as f:
    json.dump(full_result, f, indent=4)

print("Enriched data saved to ecmofsynthesis_enriched.json")


# Validate enriched data according to the schema for enriched files
with open("ecmofsynthesis_enriched.schema.json") as f:
    schema = json.load(f)

validate(full_result, schema)
print("Enriched data validated successfully")

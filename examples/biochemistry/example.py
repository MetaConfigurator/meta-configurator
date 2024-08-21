import json
import re

from rdkit import Chem
from rdkit.Chem import Draw
import pubchempy as pcp

RE_SMILES = re.compile(r"/^([^J][a-z0-9@+\-\[\]\(\)\\\/%=#$]{6,})$/ig")
RE_INCHI = re.compile(
    r"/^((InChI=)?[^J][0-9BCOHNSOPrIFla+\-\(\)\\\/,pqbtmsih]{6,})$/ig"
)
RE_INCHIKEY = re.compile(r"/^([0-9A-Z\-]+)$/")

cached_compounds = {}

def queryCompoundFromPubChem(query: str) -> pcp.Compound | None:
    if query in cached_compounds:
        return cached_compounds[query]

    match query:
        case query if query.isdigit():
            compound_options = [(pcp.Compound.from_cid(query))]
        case query if RE_SMILES.match(query):
            compound_options = pcp.get_compounds(query, "smiles")
        case query if RE_INCHI.match(query):
            compound_options = pcp.get_compounds(query, "inchi")
        case query if RE_INCHIKEY.match(query):
            compound_options = pcp.get_compounds(query, "inchikey")
        case _:
            compound_options = pcp.get_compounds(query, "name")

    # for now by default select first option
    if len(compound_options) > 0:
        compound = compound_options[0]
        cached_compounds[query] = compound
        return compound

    # Cache the compound
    cached_compounds[query] = None
    return None

def collectMetadata(compoundName: str, mass: float, mass_unit: str):
    compound = queryCompoundFromPubChem(compoundName)
    if compound is None:
        print('Error: Could not find molecule in PubChem: ' + compoundName)
        return {}

    # Append metadata
    compoundMetadata = {
        'cid': compound.cid,
        'inchi': compound.inchi,
        'inchikey': compound.inchikey,
        'smiles': compound.isomeric_smiles,
        'canonical_smiles': compound.canonical_smiles,
        'iupac_name': compound.iupac_name,
        'molecular_weight': compound.molecular_weight,
        # 'mass': mass,
        # 'mass_unit': mass_unit,
    }

    return compoundMetadata


# Load JSON document with synthesis data
with open('ecmofsynthesis.json') as f:
    data = json.load(f)

result_data = []

# Iterate over the JSON document
for index, entry in enumerate(data[('ecmofsynthesis')]):

    metalSaltName = entry['metal_salt_name']
    metalSaltMass = entry['metal_salt_mass']
    metalSaltMassUnit = entry['metal_salt_mass_unit']
    metalSaltMetadata = collectMetadata(metalSaltName, metalSaltMass, metalSaltMassUnit)

    linkerName = entry['linker_name']
    linkerMass = entry['linker_mass']
    linkerMassUnit = entry['linker_mass_unit']
    linkerMetadata = collectMetadata(linkerName, linkerMass, linkerMassUnit)

    # draw both molecules and save to disk
    if 'smiles' in metalSaltMetadata:
        mol1 = Chem.MolFromSmiles(metalSaltMetadata['smiles'])
        Draw.MolToFile(mol1, f'metal_salt_{metalSaltName}.png')
    if 'smiles' in linkerMetadata:
        mol2 = Chem.MolFromSmiles(linkerMetadata['smiles'])
        Draw.MolToFile(mol2, f'linker_{linkerName}.png')

    # Append metadata to the entry
    result_entry = entry
    result_entry['metal_salt'] = metalSaltMetadata
    result_entry['linker'] = linkerMetadata
    result_data.append(result_entry)

# Save the result data
with open('ecmofsynthesis_result.json', 'w') as f:
    json.dump(result_data, f, indent=4)

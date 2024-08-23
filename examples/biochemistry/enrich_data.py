import json
import re

from rdkit import Chem
from rdkit.Chem import Draw
import pubchempy as pcp

# Partially copied and adapted from https://github.com/FAIRChemistry/substance-query/blob/main/substancewidget
# /substancewidget.py

# Regular expressions to differentiate between smiles code, inchi, and inchikey
RE_SMILES = re.compile(r"/^([^J][a-z0-9@+\-\[\]\(\)\\\/%=#$]{6,})$/ig")
RE_INCHI = re.compile(
    r"/^((InChI=)?[^J][0-9BCOHNSOPrIFla+\-\(\)\\\/,pqbtmsih]{6,})$/ig"
)
RE_INCHIKEY = re.compile(r"/^([0-9A-Z\-]+)$/")

# This data structure will store the PubChem compounds that have been queried, so that we don't have to query them again
cached_compounds = {}


def queryCompoundFromPubChem(query: str) -> pcp.Compound | None:
    """
    Query a compound using the PubChemPy library. The query can be a CID, SMILES, InChI, or InChIKey.
    :param query: The query string
    """
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


def collectMetadata(compoundName: str):
    """
    Collect metadata for a compound from PubChem
    :param compoundName: The name of the compound
    :return: A dictionary with metadata
    """
    compound = queryCompoundFromPubChem(compoundName)
    if compound is None:
        print('Error: Could not find molecule in PubChem: ' + compoundName)
        return {}

    # Append metadata
    compoundMetadata = {
        'cid': compound.cid,
        'inchi_code': compound.inchi,
        'smiles_code': compound.isomeric_smiles,
        'iupac_name': compound.iupac_name,
        'molecular_weight': float(compound.molecular_weight)
    }

    return compoundMetadata


# Load JSON document with synthesis data
with open('ecmofsynthesis.json') as f:
    data = json.load(f)

result_data = []

# Iterate over the JSON document
for index, entry in enumerate(data[('ecmofsynthesis')]):

    metalSaltName = entry['metal_salt_name']
    metalSaltMetadata = collectMetadata(metalSaltName)

    linkerName = entry['linker_name']
    linkerMetadata = collectMetadata(linkerName)

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
full_result = {
    'ecmofsynthesis': result_data
}
with open('ecmofsynthesis_enriched.json', 'w') as f:
    json.dump(full_result, f, indent=4)

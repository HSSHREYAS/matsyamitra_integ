import ee

ee.Initialize(project="matsyamitra-492811")

collection = ee.ImageCollection("NOAA/CDR/OISST/V2_1")

print(collection.size().getInfo())
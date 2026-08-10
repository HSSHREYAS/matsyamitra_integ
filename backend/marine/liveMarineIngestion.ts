import {DATABASE_URL} from './config';
import {runMarineIngestion} from './ingest';
import {createMarinePool} from './repository';

async function main(): Promise<void> {
  const pool = createMarinePool(DATABASE_URL);
  try {
    const result = await runMarineIngestion(pool);

    console.log('Open-Meteo Marine Ingestion Summary');
    console.log(`Requested locations: ${result.summary.requestedLocations}`);
    console.log(`Parsed observations: ${result.summary.parsedObservations}`);
    console.log(`Inserted: ${result.summary.inserted}`);
    console.log(`Skipped: ${result.summary.skipped}`);
    console.log(`Updated: ${result.summary.updated}`);
    console.log(`Replaced: ${result.summary.replaced}`);
    console.log('Warnings:');
    if (result.summary.warnings.length === 0) {
      console.log('- None');
    } else {
      result.summary.warnings.forEach(warning => console.log(`- ${warning}`));
    }

    console.log('\nOPEN-METEO MARINE INTEGRATION: PASS');
  } catch (error) {
    console.error('\nOPEN-METEO MARINE INTEGRATION: FAIL');
    console.error(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();

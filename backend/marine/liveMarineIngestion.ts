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

    console.log('\nSample operational risk records');
    result.riskResults.slice(0, 5).forEach(record => {
      console.log(
        JSON.stringify(
          {
            location_id: record.locationId,
            latitude: record.latitude,
            longitude: record.longitude,
            source_latitude: record.sourceLatitude,
            source_longitude: record.sourceLongitude,
            observation_timestamp: record.observationTimestamp,
            wind_speed: record.windSpeed,
            wave_height: record.waveHeight,
            risk_score: record.riskScore,
            risk_category: record.riskCategory,
          },
          null,
          2,
        ),
      );
    });

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

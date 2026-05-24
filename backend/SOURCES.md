# Sources and Data Shape

SAP parsing was designed around material-document style IDoc exports because those are common in ERP environments where fuel and procurement data start life as flat files. The representative sample data uses segment-like rows with document metadata, posting dates, plant codes, material numbers, quantities, and SAP units. In a real deployment, the first thing to break would be the vendor-specific variation in segment layout and unit codes.

Utility parsing was based on common electricity portal exports from suppliers such as Tata Power, MSEDCL, and PG&E smart meter downloads. The sample data uses mixed billing periods, different meter IDs, and unit edge cases such as kVAh. In a real deployment, the first failure point would be column-name drift and hidden locale-specific date formats.

Travel parsing was based on structured trip data shaped like Concur or similar travel platforms. The sample data includes air, hotel, car, and rail segments, plus one unknown airport code to exercise the unresolved-code path. In a real deployment, the first breakage would likely be incomplete segment metadata and changes in provider response shape.

The demo seed data was constructed to look realistic while still surfacing every major flag type. It intentionally mixes approved, pending, flagged, and rejected records, includes unresolved codes, unit mismatches, zero values, and a missing-factor case, and spreads records across multiple dates so review filters and summary counts behave like a live tenant.
import type { UpdatePreferencesRequest } from "@contracts/client";
import { profileApi } from "./contractsClient";

export async function updatePreferences(input: UpdatePreferencesRequest) {
  return profileApi.mePreferencesPatch({
    updatePreferencesRequest: input
  });
}

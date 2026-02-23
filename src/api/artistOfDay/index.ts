import { fetchDashboardData } from "../dashboard/public";

export { getArtistOfDay, recordArtistOfDayClick, upsertMySocialLinks } from "../supabase/artistOfDay";

export const fetchArtistsOfTheDayFull = async () => {
    const dashboard = await fetchDashboardData();
    return dashboard?.artistsOfTheDay || [];
};

export const claimArtistOfDayReward = async (_userId: string, _artistId: string) => {
    return { success: false, updatedUser: null };
};

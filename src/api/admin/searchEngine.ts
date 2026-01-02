
import { getRepository } from "../database/repository.factory";

const repo = getRepository();

export const SearchEngine = {
    globalSearch: (query: string) => {
        const lowerQuery = query.toLowerCase();
        
        const users = repo.select("users").filter((u: any) => 
            u.name.toLowerCase().includes(lowerQuery) || 
            u.email.toLowerCase().includes(lowerQuery) || 
            u.id.includes(lowerQuery)
        );

        const missions = repo.select("missions").filter((m: any) => 
            m.title.toLowerCase().includes(lowerQuery) ||
            m.id.includes(lowerQuery)
        );

        const items = [...repo.select("redeemedItems")].filter((i: any) => 
            i.itemName.toLowerCase().includes(lowerQuery) ||
            i.id.includes(lowerQuery)
        );

        return {
            users,
            missions,
            items
        };
    }
};

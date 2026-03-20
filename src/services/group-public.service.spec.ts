import { GroupPublicService } from './group-public.service';

describe('GroupPublicService', () => {
  it('returns no matches payload when nothing matches the query', async () => {
    const prismaServiceMock = {
      group: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as any;

    const service = new GroupPublicService(prismaServiceMock);

    const result = await service.search({
      city: 'Paris',
      start: '2027-01-01T00:00:00Z',
      end: '2027-01-05T00:00:00Z',
      budget: 5000,
    });

    expect(prismaServiceMock.group.findMany).toHaveBeenCalledTimes(1);
    expect(result.total).toBe(0);
    expect(result.noMatches).toBe(true);
    expect(result.matches).toEqual([]);
    expect(result.message).toBe('No matching groups found.');
  });
});

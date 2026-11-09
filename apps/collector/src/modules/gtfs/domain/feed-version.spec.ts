import { fixtureFeed, smallFeed } from '../test/feed';
import { feedContentHash } from './feed-version';

describe('feedContentHash', () => {
  it('matches the version the database seed records for the same excerpt', () => {
    expect(feedContentHash(fixtureFeed())).toMatch(/^80d9240b299c[0-9a-f]{52}$/);
  });

  it('changes when any file changes', () => {
    const changed = smallFeed();
    changed.frequencies = changed.frequencies.replace('600', '900');

    expect(feedContentHash(changed)).not.toBe(feedContentHash(smallFeed()));
  });
});

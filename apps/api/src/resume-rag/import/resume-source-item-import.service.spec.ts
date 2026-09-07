import { findRetiredResumeSourceItemIds } from './resume-source-item-import.service';

const item = (
  id: string,
  sourceType: string,
  sourceKey: string,
  status = 'active',
) => ({ id, sourceType, sourceKey, status });

const entry = (id: string, sourceType: string) => ({ id, sourceType });

describe('findRetiredResumeSourceItemIds', () => {
  it('manifest에서 사라진 관리 원본과 그 섹션만 retire 대상으로 고른다', () => {
    expect(
      findRetiredResumeSourceItemIds(
        [
          item('keep-root', 'app_resume', 'app:resume-data'),
          item('keep-section', 'app_resume', 'app:resume-data#experience'),
          item('remove-root', 'app_resume', 'app:removed'),
          item('remove-section', 'app_resume', 'app:removed#detail'),
          item('workspace', 'resume_workspace', 'workspace:private'),
          item('already-old', 'app_resume', 'app:old', 'superseded'),
        ],
        [entry('app:resume-data', 'app_resume')],
        ['app_resume'],
      ),
    ).toEqual(['remove-root', 'remove-section']);
  });

  it('해당 sourceType의 현재 manifest가 비어 있으면 전체 retire를 하지 않는다', () => {
    expect(
      findRetiredResumeSourceItemIds(
        [item('existing', 'app_resume', 'app:resume-data')],
        [],
        ['app_resume'],
      ),
    ).toEqual([]);
  });

  it('관리 대상으로 지정하지 않은 sourceType은 변경하지 않는다', () => {
    expect(
      findRetiredResumeSourceItemIds(
        [item('workspace', 'resume_workspace', 'workspace:old')],
        [entry('app:resume-data', 'app_resume')],
        ['app_resume'],
      ),
    ).toEqual([]);
  });
});

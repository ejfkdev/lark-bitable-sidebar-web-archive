/* eslint-disable max-lines */
import './index.css';
import {
  bitable,
  FieldType,
  IOpenAttachment,
  ToastType,
  type IFieldMeta,
  type ITable,
} from '@lark-base-open/js-sdk';
import { useState } from 'react';
import {
  Typography,
  Select,
  Tooltip,
  Space,
  ConfigProvider,
  Button,
  Skeleton,
  Link,
} from '@arco-design/web-react';
import {
  IconAttachment,
  IconCamera,
  IconDown,
  IconLink,
  IconQuestionCircle,
} from '@arco-design/web-react/icon';
import { useAsyncEffect, useCounter, useMemoizedFn } from 'ahooks';
import archive from '@api/archive';
import { AsyncPool, type WorkerOptions } from '@shared/async-pool/esm';
import { useTranslation } from 'react-i18next';
import { base64ToFile, getLocale } from '@shared/utils';
import { CProgressStacked, CProgress } from '@coreui/react';
import '@coreui/coreui/dist/css/coreui.min.css';
import { sleep } from '@shared/async-pool/cjs';

const Index = () => {
  const [locale, setLocale] = useState('zh-CN');
  const { t } = useTranslation();

  const [ready, setReady] = useState(false);
  const [loading, setLoding] = useState(false);
  const [table, setTable] = useState<ITable>();
  const [tableName, setTableName] = useState<string>();
  const [fieldMetaList, setFieldMetaList] = useState<IFieldMeta[]>();
  const [srcID, setSrcID] = useState<string | undefined>(undefined);
  const [dstID, setDstID] = useState<string | undefined>(undefined);
  const [done, { inc: incDone, reset: resetDone }] = useCounter(0);
  const [fail, { inc: incFail, reset: resetFail }] = useCounter(0);
  const [total, { inc: incTotal, reset: resetTotal }] = useCounter(0);

  bitable.bridge.getTheme().then(theme => updateTheme(theme));
  bitable.bridge.onThemeChange(event => {
    updateTheme(event.data.theme);
  });

  // 获取当前打开的表格
  useAsyncEffect(async () => {
    await updateActiveTable();
    bitable.base.onSelectionChange(event => {
      if (!table?.id || table?.id === event.data.tableId) {
        return;
      }
      updateActiveTable();
    });
    const locale = await bitable.bridge.getLocale();
    setLocale(locale);
    setReady(true);
  }, []);

  // 同步table
  const updateActiveTable = async () => {
    const table = await bitable.base.getActiveTable();
    table.onFieldModify(updateFieldMetaList);
    setTable(table);
    setTableName(await table.getName());
    await updateFieldMetaList();
    requestAnimationFrame(updateConfigData);
  };

  // 同步当前table的field
  const updateFieldMetaList = useMemoizedFn(async () => {
    const fieldMetaList = await table!.getFieldMetaList();
    setFieldMetaList(fieldMetaList);
  });

  // 同步配置
  const updateConfigData = useMemoizedFn(async () => {
    if (!table?.id) {
      return;
    }
    const srcid = await bitable.bridge.getData<string>(`srcID/${table?.id}`);
    const dstid = await bitable.bridge.getData<string>(`dstID/${table?.id}`);
    if (fieldMetaList?.some(f => f.id === srcid)) {
      setSrcID(srcid);
    }
    if (fieldMetaList?.some(f => f.id === dstid)) {
      setDstID(dstid);
    }
  });

  const updateTheme = async (theme: string) => {
    if (theme === 'DARK') {
      // 设置为暗黑主题
      document.body.setAttribute('arco-theme', 'dark');
    } else {
      // 恢复亮色主题
      document.body.removeAttribute('arco-theme');
    }
  };

  const fetchArchive = useMemoizedFn(
    async (src: any, workerCtx: WorkerOptions<any>) => {
      const url = src.value[0].link as string;
      const data = await archive({ query: { url } });
      console.log(`fetchArchive`, url, data?.ok);
      if (data.ok === 1) {
        try {
          const file = base64ToFile(
            data.base64,
            data.filename,
            'application/zip',
          );
          uploadPool.addTodo({
            src,
            file,
          });
          console.log(`fetchArchive ok`, url, data.filename, file.size);
        } catch (error) {
          console.log(`fetchArchive`, error);
          workerCtx.retry(1000);
        }
      } else {
        workerCtx.retry(1000);
      }
    },
  );

  const fetchPool = new AsyncPool({
    parallel: 6,
    waitTime: 1000,
    maxRetryCount: 2,
    worker: fetchArchive,
    taskFailCallback: () => {
      console.log(`incFail fetchPool taskFailCallback`);
      incFail();
    },
  });

  const uploadArchive = useMemoizedFn(
    async (data: any, workerCtx: WorkerOptions<any>) => {
      try {
        console.log(`uploadArchive start`, Date.now());
        const tokens = await bitable.base.batchUploadFile([data.file]);
        if (
          !(tokens && tokens.length > 0 && tokens[0] && tokens[0].length > 0)
        ) {
          console.log(`incFail uploadArchive token null`, tokens);
          incFail();
          return;
        }
        console.log(
          `uploadArchive file_token`,
          data.src.value[0].link,
          tokens[0],
        );
        const response = await table?.setCellValue<IOpenAttachment[]>(
          dstID as string,
          data.src.record_id,
          [
            {
              token: tokens[0],
              size: data.file.size,
              name: data.file.name,
              type: data.file.type,
              timeStamp: new Date().getTime(),
            },
          ],
        );
        if (response) {
          incDone();
        } else {
          console.log(`incFail uploadArchive write cell`);
          incFail();
        }
      } catch (error) {
        console.log(`uplaodArchive error`, error);
        workerCtx.retry(1000);
      }
    },
  );

  const uploadPool = new AsyncPool({
    parallel: 1,
    maxRetryCount: 0,
    worker: uploadArchive,
    waitTime: 5000,
    rateLimiter: async (next: () => void) => {
      await sleep(2000);
      next();
    },
    taskFailCallback: () => {
      incFail();
    },
  });

  const onArchive = useMemoizedFn(async () => {
    if (!srcID || !dstID) {
      bitable.ui.showToast({
        toastType: ToastType.warning,
        message: t('blank'),
      });
      return;
    }
    setLoding(true);
    resetDone();
    resetFail();
    resetTotal();

    const srcField = await table?.getFieldById(srcID);
    const dstField = await table?.getFieldById(dstID);
    bitable.bridge.setData(`srcID/${table?.id}`, srcID);
    bitable.bridge.setData(`dstID/${table?.id}`, dstID);
    let srcValues = await srcField?.getFieldValueList();
    const dstValues = (await dstField?.getFieldValueList()) ?? [];
    const dstRecordIds = dstValues.map(d => d.record_id);
    // 不重复处理已经有附件的链接
    srcValues = srcValues?.filter(v => !dstRecordIds.includes(v.record_id));
    if (!srcValues || srcValues?.length === 0) {
      bitable.ui.showToast({
        toastType: ToastType.warning,
        message: t('nourl'),
      });
      setLoding(false);
      return;
    }
    for (const src of srcValues ?? []) {
      fetchPool.addTodo(src);
      incTotal();
    }
    if (fetchPool.activeWorkerCounts() + fetchPool.queueCounts() > 0) {
      await fetchPool.waitAllWorkerDone();
      if (uploadPool.activeWorkerCounts() + uploadPool.queueCounts() > 0) {
        await uploadPool.waitAllWorkerDone();
      }
    }
    bitable.ui.showToast({
      toastType: ToastType.warning,
      message: t('done'),
    });
    setLoding(false);
  });

  if (!ready) {
    return <Skeleton animation loading={!ready} />;
  }

  return (
    // @ts-expect-error
    <ConfigProvider locale={getLocale(locale)}>
      <Space direction="vertical" size="medium" style={{ width: '100%' }}>
        <Typography.Text>{tableName}</Typography.Text>
        <Select
          showSearch
          addBefore={
            <>
              {t('src')}
              <IconLink />
            </>
          }
          placeholder={t('src.msg')}
          defaultValue={srcID}
          value={srcID}
          onChange={value => setSrcID(value)}
        >
          {fieldMetaList
            ?.filter(meta => meta.type === FieldType.Url)
            ?.map(meta => (
              <Select.Option key={meta.id} value={meta.id}>
                {meta.name}
              </Select.Option>
            ))}
        </Select>
        <Select
          showSearch
          allowCreate
          addBefore={
            <>
              {t('dst')}
              <IconAttachment />
            </>
          }
          placeholder={t('dst.msg')}
          defaultValue={dstID}
          value={dstID}
          onChange={async (value: string) => {
            if (value.startsWith('fld')) {
              setDstID(value);
            } else if (table) {
              const id = await table.addField({
                name: value,
                type: FieldType.Attachment,
              });
              setDstID(id);
            }
          }}
          suffixIcon={
            <Space size={'small'}>
              <Tooltip content={t('dst.tip')}>
                <IconQuestionCircle />
              </Tooltip>
              <IconDown />
            </Space>
          }
        >
          {fieldMetaList
            ?.filter(meta => meta.type === FieldType.Attachment)
            ?.map(meta => (
              <Select.Option key={meta.id} value={meta.id}>
                {meta.name}
              </Select.Option>
            ))}
        </Select>

        <Space size="large">
          <Button
            type="primary"
            icon={<IconCamera />}
            loading={loading}
            onClick={onArchive}
          >
            {t('btn')}
          </Button>
          <Link
            target="_blank"
            href="https://ejfk-dev.feishu.cn/wiki/UrG7wAgrciUor6kkGJKcApAFn7c"
            icon
          >
            {t('doc')}
          </Link>
        </Space>

        {total > 0 && (
          <>
            <CProgressStacked style={{ height: 4 }}>
              <CProgress
                height={4}
                color="success"
                animated
                value={total > 0 ? (done / total) * 100 : 0}
              />
              <CProgress
                height={4}
                color="danger"
                value={total > 0 ? (fail / total) * 100 : 0}
              />
            </CProgressStacked>
            <Typography.Text type="secondary">{`✅${done}  ❎${fail} / ⌛️${total}`}</Typography.Text>
          </>
        )}
      </Space>
    </ConfigProvider>
  );
};

export default Index;

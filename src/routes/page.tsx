import './index.css';
import {
  bitable,
  FieldType,
  IOpenSegmentType,
  IOpenUrlSegment,
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
  Progress,
} from '@arco-design/web-react';
import {
  IconCamera,
  IconDown,
  IconQuestionCircle,
} from '@arco-design/web-react/icon';
import { useAsyncEffect, useCounter, useMemoizedFn } from 'ahooks';
import zhCN from '@arco-design/web-react/es/locale/zh-CN';
import enUS from '@arco-design/web-react/es/locale/en-US';
import jaJP from '@arco-design/web-react/es/locale/ja-JP';
import koKR from '@arco-design/web-react/es/locale/ko-KR';
import idID from '@arco-design/web-react/es/locale/id-ID';
import thTH from '@arco-design/web-react/es/locale/th-TH';
import zhHK from '@arco-design/web-react/es/locale/zh-HK';
import frFR from '@arco-design/web-react/es/locale/fr-FR';
import esES from '@arco-design/web-react/es/locale/es-ES';
import deDE from '@arco-design/web-react/es/locale/de-DE';
import itIT from '@arco-design/web-react/es/locale/it-IT';
import viVN from '@arco-design/web-react/es/locale/vi-VN';
import archive from '@api/archive';
import { AsyncPool } from 'lib/async-pool/esm';
import { useTranslation } from 'react-i18next';

const Index = () => {
  const [locale, setLocale] = useState('zh-CN');
  const { t } = useTranslation();

  function getLocale() {
    switch (locale) {
      case 'zh-CN':
        return zhCN;
      case 'en-US':
        return enUS;
      case 'ja-JP':
        return jaJP;
      case 'ko-KR':
        return koKR;
      case 'id-ID':
        return idID;
      case 'th-TH':
        return thTH;
      case 'zh-HK':
        return zhHK;
      case 'fr-FR':
        return frFR;
      case 'es-ES':
        return esES;
      case 'de-DE':
        return deDE;
      case 'it-IT':
        return itIT;
      case 'vi-VN':
        return viVN;
      default:
        return enUS;
    }
  }

  const [ready, setReady] = useState(false);
  const [loading, setLoding] = useState(false);
  const [table, setTable] = useState<ITable>();
  const [tableName, setTableName] = useState<string>();
  const [fieldMetaList, setFieldMetaList] = useState<IFieldMeta[]>();
  const [srcID, setSrcID] = useState<string | undefined>(undefined);
  const [dstID, setDstID] = useState<string | undefined>(undefined);
  const [done, { inc: incDone, reset: resetDone }] = useCounter(0);
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
    await updateConfigData();
  };

  // 同步当前table的field
  const updateFieldMetaList = useMemoizedFn(async () => {
    const fieldMetaList = await table!.getFieldMetaListByType(FieldType.Url);
    setFieldMetaList(fieldMetaList);
  });

  // 同步配置
  const updateConfigData = useMemoizedFn(async () => {
    if (!table?.id) {
      return;
    }
    const srcid = await bitable.bridge.getData<string>(`srcID/${table?.id}`);
    if (String(srcid).startsWith('fld')) {
      setSrcID(srcid);
    }
    const dstid = await bitable.bridge.getData<string>(`dstID/${table?.id}`);
    if (String(dstid).startsWith('fld')) {
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

  const archiveURL = useMemoizedFn(async (src: any) => {
    const data = await archive({ query: { url: src.value[0].link } });
    if (data.ok) {
      await table?.setCellValue<IOpenUrlSegment[]>(
        dstID as string,
        src.record_id,
        [
          {
            type: IOpenSegmentType.Url,
            text: data.url,
            link: data.url,
          },
        ],
      );
    }
    incDone();
  });

  const pool = new AsyncPool({
    parallel: 6,
    waitTime: 100,
    worker: archiveURL,
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
    resetTotal();
    const srcField = await table?.getFieldById(srcID);
    const dstField = await table?.getFieldById(dstID);
    bitable.bridge.setData(`srcID/${table?.id}`, srcID);
    bitable.bridge.setData(`dstID/${table?.id}`, dstID);
    // const srcName = await srcField?.getName();
    // const dstName = await dstField?.getName();
    let srcValues = await srcField
      ?.getFieldValueList
      // `[${srcName}].isblank().not().and([${srcName}].lower().containtext("https://web.archive.org").not())`,
      ();
    const dstValues =
      (await dstField
        ?.getFieldValueList
        // `[${dstName}].isblank()`
        ()) ?? [];
    const dstRecordIds = dstValues.map(d => d.record_id);
    console.log(`srcValues`, srcValues);
    console.log(`dstValues`, dstValues);
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
      pool.addTodo(src);
      incTotal();
    }
    if (pool.activeWorkerCounts() + pool.queueCounts() > 0) {
      await pool.waitAllWorkerDone();
    }
    setLoding(false);
    bitable.ui.showToast({
      toastType: ToastType.warning,
      message: t('done'),
    });
  });

  if (!ready) {
    return <Skeleton animation loading={!ready} />;
  }

  return (
    // @ts-expect-error
    <ConfigProvider locale={getLocale()}>
      <Space direction="vertical" size="medium" style={{ width: '100%' }}>
        <Typography.Text>{tableName}</Typography.Text>
        <Select
          showSearch
          addBefore={t('src')}
          placeholder={t('src.msg')}
          defaultValue={srcID}
          value={srcID}
          onChange={value => {
            setSrcID(value);
            if (dstID === value) {
              setDstID('');
            }
          }}
        >
          {fieldMetaList?.map(meta => (
            <Select.Option key={meta.id} value={meta.id}>
              {meta.name}
            </Select.Option>
          ))}
        </Select>
        <Select
          showSearch
          addBefore={t('dst')}
          placeholder={t('dst.msg')}
          defaultValue={dstID}
          value={dstID}
          onChange={value => setDstID(value)}
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
            ?.filter(meta => meta.id !== srcID)
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
            href="https://ejfk-dev.feishu.cn/wiki/AZO5wW0tuijuCqkOs76cbENcnxh"
            icon
          >
            {t('doc')}
          </Link>
        </Space>

        {total > 0 && (
          <Progress
            animation={loading}
            percent={total > 0 ? (done / total) * 100 : 0}
            status={loading ? 'warning' : 'success'}
            formatText={() => `${done} / ${total}`}
          />
        )}
      </Space>
    </ConfigProvider>
  );
};

export default Index;

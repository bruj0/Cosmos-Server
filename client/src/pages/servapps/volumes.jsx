// material-ui
import { AppstoreAddOutlined, CloseSquareOutlined, DeleteOutlined, PauseCircleOutlined, PlaySquareOutlined, PlusCircleOutlined, ReloadOutlined, RollbackOutlined, SearchOutlined, SettingOutlined, StopOutlined, SyncOutlined, UpCircleOutlined, UpSquareFilled } from '@ant-design/icons';
import { Alert, Badge, Button, Card, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, IconButton, Input, InputAdornment, TextField, Tooltip, Typography, useTheme } from '@mui/material';
import Grid2 from '@mui/material/Unstable_Grid2/Grid2';
import { Stack } from '@mui/system';
import { useEffect, useState } from 'react';
import Paper from '@mui/material/Paper';
import { styled } from '@mui/material/styles';

import * as API from '../../api';
import IsLoggedIn from '../../isLoggedIn';
import RestartModal from '../config/users/restart';
import RouteManagement from '../config/routes/routeman';
import { ValidateRoute, getFaviconURL, sanitizeRoute } from '../../utils/routes';
import HostChip from '../../components/hostChip';
import PrettyTableView from '../../components/tableView/prettyTableView';
import NewVolumeButton from './createVolumes';

const VolumeManagementList = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [rows, setRows] = useState(null);
    const [tryDelete, setTryDelete] = useState(null);
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    function refresh() {
        setIsLoading(true);
        API.docker.volumeList()
        .then(data => {
            setRows(data.data.Volumes);
            setIsLoading(false);
        });
    }

    useEffect(() => {
        refresh();
    }, [])

    return (
        <>
          <Stack direction='row' spacing={1} style={{ marginBottom: '20px' }}>
            <Button variant="contained" color="primary" startIcon={<SyncOutlined />} onClick={refresh}>
                Refresh
            </Button>
          </Stack>

            {isLoading && (<div style={{height: '550px'}}>
                <center>
                    <br />
                    <CircularProgress />
                </center>
            </div>
            )}

            {!isLoading && rows && (
                <PrettyTableView
                    data={rows}
                    onRowClick={() => {}}
                    getKey={(r) => r.Name}
                    buttons={[
                        <NewVolumeButton refresh={refresh} />,
                    ]}
                    columns={[
                        {
                            title: 'Volume Name',
                            field: (r) =>  <Stack direction='column'>
                            <div style={{display:'inline-block', textDecoration: 'inherit', fontSize:'125%', color: isDark ? theme.palette.primary.light : theme.palette.primary.dark}}>{r.Name}</div><br/>
                            <div style={{display:'inline-block', textDecoration: 'inherit', fontSize: '90%', opacity: '90%'}}>{r.Mountpoint}</div>
                          </Stack>,
                            search: (r) => r.Name,
                        },
                        {
                            title: 'Driver',
                            screenMin: 'lg', 
                            field: (r) => r.Driver,
                        },
                        {
                            title: 'Scope',
                            screenMin: 'lg', 
                            field: (r) => r.Scope,
                        },
                        {
                            title: 'Created At',
                            screenMin: 'lg', 
                            field: (r) => new Date(r.CreatedAt).toLocaleString(),
                        },
                        {
                            title: '',
                            clickable: true,
                            field: (r) => (
                                <>
                                    <Button
                                        variant="contained"
                                        color="error"
                                        startIcon={<DeleteOutlined />}
                                        onClick={() => {
                                          if(tryDelete === r.Name) {
                                            setIsLoading(true);
                                            API.docker.volumeDelete(r.Name).then(() => {
                                                refresh();
                                                setIsLoading(false);
                                            }).catch(() => {
                                                setIsLoading(false);
                                                refresh();
                                            });
                                          } else {
                                            setTryDelete(r.Name);
                                          }
                                        }}
                                    >
                                        {tryDelete === r.Name ? "Really?" : "Delete"}
                                    </Button>
                                </>
                            ),
                        },
                    ]}
                />
            )}
        </>
    );
};

export default VolumeManagementList;
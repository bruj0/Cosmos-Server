import React from 'react';
import { Formik } from 'formik';
import { Button, Stack, Grid, MenuItem, TextField, IconButton, FormHelperText, CircularProgress, useTheme, Alert, useMediaQuery } from '@mui/material';
import MainCard from '../../../components/MainCard';
import { CosmosCheckbox, CosmosFormDivider, CosmosInputText, CosmosSelect }
  from '../../config/users/formShortcuts';
import { ApiOutlined, CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons';
import * as API from '../../../api';
import { LoadingButton } from '@mui/lab';
import PrettyTableView from '../../../components/tableView/prettyTableView';
import { NetworksColumns } from '../networks';
import NewNetworkButton from '../createNetwork';
import LinkContainersButton from '../linkContainersButton';

const NetworkContainerSetup = ({ config, containerInfo, refresh, newContainer, OnChange, OnConnect, OnDisconnect }) => {
  const [networks, setNetworks] = React.useState([]);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const padding = isMobile ? '6px 4px' : '12px 10px';

  const isForceSecure = containerInfo.Config.Labels.hasOwnProperty('cosmos-force-network-secured') &&
  containerInfo.Config.Labels['cosmos-force-network-secured'] === 'true';

  React.useEffect(() => {
    API.docker.networkList().then((res) => {
      setNetworks(res.data);
    });
  }, []);

  const refreshAll = () => {
    if(refresh)
      refresh().then(() => {
        API.docker.networkList().then((res) => {
          setNetworks(res.data);
        });
      });
    else 
      API.docker.networkList().then((res) => {
        setNetworks(res.data);
      });
  };

  const connect = (network) => {
    if(!OnConnect) {
      return API.docker.attachNetwork(containerInfo.Name.replace('/', ''), network).then(() => {
        refreshAll();
      });
    } else {
      OnConnect(network);
      refreshAll();
    }
  }

  const disconnect = (network) => {
    if(!OnDisconnect) {
      return API.docker.detachNetwork(containerInfo.Name.replace('/', ''), network).then(() => {
        refreshAll();
      });
    } else {
      OnDisconnect(network);
      refreshAll();
    }
  }

  return (<Stack spacing={2}>
    <div style={{ maxWidth: '1000px', width: '100%', margin: '', position: 'relative' }}>
      <Formik
        initialValues={{
          networkMode: containerInfo.HostConfig.NetworkMode,
          ports: Object.keys(containerInfo.NetworkSettings.Ports).map((port) => {
            return {
              port: port.split('/')[0],
              protocol: port.split('/')[1],
              hostPort: containerInfo.NetworkSettings.Ports[port] && containerInfo.NetworkSettings.Ports[port][0] ?
                containerInfo.NetworkSettings.Ports[port][0].HostPort : '',
            };
          })
        }}
        validate={(values) => {
          const errors = {};
          // check unique
          const ports = values.ports.map((port) => {
            return `${port.port}/${port.protocol}`;
          });
          const unique = [...new Set(ports)];
          if (unique.length !== ports.length) {
            errors.submit = 'Ports must be unique';
          }
          OnChange && OnChange(values);
          return errors;
        }}
        onSubmit={async (values, { setErrors, setStatus, setSubmitting }) => {
          if(newContainer) return false;
          setSubmitting(true);
          const realvalues = {
            portBindings: {},
            networkMode: values.networkMode,
          };
          values.ports.forEach((port) => {
            if (port.hostPort) {
              realvalues.portBindings[`${port.port}/${port.protocol}`] = [
                {
                  HostPort: port.hostPort,
                }
              ];
            }
          });
          return API.docker.updateContainer(containerInfo.Name.replace('/', ''), realvalues)
            .then((res) => {
              setStatus({ success: true });
              setSubmitting(false);
              refresh && refresh();
            }
            ).catch((err) => {
              setStatus({ success: false });
              setErrors({ submit: err.message });
              setSubmitting(false);
              refresh && refresh();
            });
        }}
      >
        {(formik) => (
          <form noValidate onSubmit={formik.handleSubmit}>
            <Stack spacing={2}>

              <MainCard title={'Network Settings'}>
                <Stack spacing={4}>
                  {containerInfo.State && containerInfo.State.Status !== 'running' && (
                  <Alert severity="warning" style={{ marginBottom: '0px' }}>
                      This container is not running. Editing any settings will cause the container to start again.
                    </Alert>
                  )}
                  {isForceSecure && (
                    <Alert severity="warning" style={{ marginBottom: '0px' }}>
                      This container is forced to be secured. You cannot expose any ports to the internet directly, please create a URL in Cosmos instead. You also cannot connect it to the Bridge network.          
                    </Alert>
                  )}
                  <CosmosInputText
                    label="Network Mode"
                    name="networkMode"
                    placeholder={'default'}
                    formik={formik}
                  />
                  <CosmosFormDivider title={'Expose Ports'} />
                  <div>
                    {formik.values.ports.map((port, idx) => (
                      <Grid container key={idx}>
                        <Grid item xs={4} style={{ padding }}>
                          <TextField
                            label="Container Port"
                            fullWidth
                            value={port.port}
                            onChange={(e) => {
                              const newports = [...formik.values.ports];
                              newports[idx].port = e.target.value;
                              formik.setFieldValue('ports', newports);
                            }}
                          />
                        </Grid>
                        <Grid item xs={4} style={{ padding }}>
                          <TextField
                            fullWidth
                            label="Host port"
                            value={'' + port.hostPort}
                            onChange={(e) => {
                              const newports = [...formik.values.ports];
                              newports[idx].hostPort = e.target.value;
                              formik.setFieldValue('ports', newports);
                            }}
                          />
                        </Grid>
                        <Grid item xs={3} style={{ padding }}>
                          <TextField
                            className="px-2 my-2"
                            variant="outlined"
                            name='protocol'
                            id='protocol'
                            select
                            value={port.protocol}
                            onChange={(e) => {
                              const newports = [...formik.values.ports];
                              newports[idx].protocol = e.target.value;
                              formik.setFieldValue('ports', newports);
                            }}
                          >
                            <MenuItem value="tcp">TCP</MenuItem>
                            <MenuItem value="udp">UDP</MenuItem>
                          </TextField>
                        </Grid>
                        <Grid item xs={1} style={{ padding }}>
                          <IconButton
                            fullWidth
                            variant="outlined"
                            color="error"
                            onClick={() => {
                              const newports = [...formik.values.ports];
                              newports.splice(idx, 1);
                              formik.setFieldValue('ports', newports);
                            }}
                          >
                            <DeleteOutlined />
                          </IconButton>
                        </Grid>
                      </Grid>
                    ))}
                    <IconButton
                      fullWidth
                      variant="outlined"
                      color="primary"
                      size='large'
                      onClick={() => {
                        const newports = [...formik.values.ports];
                        newports.push({
                          port: '',
                          protocol: 'tcp',
                          hostPort: '',
                        });
                        formik.setFieldValue('ports', newports);
                      }}
                    >
                      <PlusCircleOutlined />
                    </IconButton>
                  </div>
                  <div>
                    <Stack direction="column" spacing={2}>
                      {formik.errors.submit && (
                        <Grid item xs={12}>
                          <FormHelperText error>{formik.errors.submit}</FormHelperText>
                        </Grid>
                      )}
                      {!newContainer && <LoadingButton
                        fullWidth
                        disableElevation
                        disabled={formik.errors.submit}
                        loading={formik.isSubmitting}
                        size="large"
                        type="submit"
                        variant="contained"
                        color="primary"
                      >
                        Update Ports
                      </LoadingButton>}
                    </Stack>
                  </div>
                </Stack>
              </MainCard>
              <MainCard title={'Networks'}>
                <Stack spacing={2}>

                {networks && <Stack spacing={2}>
                  {Object.keys(containerInfo.NetworkSettings.Networks).map((networkName) => {
                    const network = networks.find((n) => n.Name === networkName);
                    if (!network) {
                      return <Alert severity="error">
                        You are connected to a network that has been removed: <strong>{networkName}</strong>. 
                        Either re-create it or
                        <Button
                          style={{ marginLeft: '10px' }}
                          variant="outlined"
                          color="primary"
                          onClick={() => {
                            disconnect(networkName);
                          }}
                        >
                          Disconnect It
                        </Button>
                      </Alert>
                    }
                  })}
                </Stack>}

                {networks && <PrettyTableView
                  data={networks}
                  sort={(a, b) => a.Name > b.Name}
                  buttons={[
                    <NewNetworkButton refresh={refreshAll} />,
                    <LinkContainersButton 
                      refresh={refreshAll} 
                      originContainer={containerInfo.Name.replace('/', '')}
                      newContainer={newContainer}
                      OnConnect={OnConnect}
                    />,
                  ]}
                  onRowClick={() => { }}
                  getKey={(r) => r.Id}
                  columns={[
                    {
                      title: '',
                      field: (r) => {
                        const isConnected = containerInfo.NetworkSettings.Networks[r.Name];
                        // icon 
                        return isConnected ?
                          <ApiOutlined style={{ color: 'green' }} /> :
                          <ApiOutlined style={{ color: 'red' }} />
                      }
                    },
                    ...NetworksColumns(theme, isDark),
                    {
                      title: '',
                      field: (r) => {
                        const isConnected = containerInfo.NetworkSettings.Networks[r.Name];
                        return (<Button
                          variant="outlined"
                          color="primary"
                          onClick={() => {
                            isConnected ? disconnect(r.Name) : connect(r.Name);
                          }}>
                          {isConnected ? 'Disconnect' : 'Connect'}
                        </Button>)
                      }
                    }
                  ]}
                />}
                {!networks && (<div style={{ height: '550px' }}>
                  <center>
                    <br />
                    <CircularProgress />
                  </center>
                </div>
                )}
                </Stack>
              </MainCard>
            </Stack>
          </form>
        )}
      </Formik>
    </div>
  </Stack>);
};

export default NetworkContainerSetup;